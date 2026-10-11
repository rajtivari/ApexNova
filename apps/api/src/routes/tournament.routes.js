import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const tournamentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  game: z.enum(['FREE_FIRE', 'BGMI']),
  format: z.enum(['BATTLE_ROYALE', 'ROUND_ROBIN', 'SINGLE_ELIMINATION']),
  entryFee: z.number().finite().nonnegative().max(1_000_000).default(0),
  prizePool: z.number().finite().nonnegative().max(100_000_000).default(0),
  startsAt: z.coerce.date(),
  registrationClosesAt: z.coerce.date(),
}).refine((data) => data.registrationClosesAt < data.startsAt, {
  message: 'Registration must close before the tournament starts',
  path: ['registrationClosesAt'],
}).refine((data) => data.startsAt > new Date(), {
  message: 'Tournament start time must be in the future',
  path: ['startsAt'],
});

const statusSchema = z.object({
  status: z.enum([
    'PUBLISHED',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'LIVE',
    'COMPLETED',
    'CANCELLED',
  ]),
});
const registrationSchema = z.object({ teamId: z.string().min(1) });
const registrationReviewSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

const allowedTransitions = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['LIVE', 'CANCELLED'],
  LIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

router.get('/', async (req, res) => {
  const tournaments = await req.app.locals.prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      game: true,
      format: true,
      status: true,
      entryFee: true,
      prizePool: true,
      startsAt: true,
      registrationClosesAt: true,
      _count: { select: { registrations: true, matches: true } },
    },
    orderBy: { startsAt: 'asc' },
  });
  return res.json(tournaments);
});

router.post('/', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const data = tournamentSchema.parse(req.body);
  const tournament = await req.app.locals.prisma.$transaction(async (tx) => {
    const created = await tx.tournament.create({ data });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'CREATE',
      entity: 'Tournament',
      entityId: created.id,
    });
    return created;
  });
  return res.status(201).json(tournament);
});

router.patch('/:id/status', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = statusSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const current = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, registrationClosesAt: true },
  });
  if (!current) return res.status(404).json({ error: 'Tournament not found' });
  if (input.status === 'REGISTRATION_OPEN' && current.registrationClosesAt <= new Date()) {
    return res.status(409).json({ error: 'Cannot open registration after the registration deadline' });
  }
  if (!allowedTransitions[current.status]?.includes(input.status)) {
    return res.status(409).json({ error: `Cannot change tournament from ${current.status} to ${input.status}` });
  }

  const tournament = await prisma.$transaction(async (tx) => {
    const updated = await tx.tournament.update({
      where: { id: current.id },
      data: { status: input.status },
    });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'STATUS_CHANGE',
      entity: 'Tournament',
      entityId: updated.id,
      metadata: { from: current.status, to: input.status },
    });
    return updated;
  });
  return res.json(tournament);
});

router.post('/:id/register', roleGuard('CAPTAIN', 'PLAYER'), async (req, res) => {
  const input = registrationSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, startsAt: true, registrationClosesAt: true, entryFee: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  if (tournament.status !== 'REGISTRATION_OPEN' || tournament.registrationClosesAt <= new Date()) {
    return res.status(409).json({ error: 'Tournament registration is closed' });
  }
  if (Number(tournament.entryFee) > 0) {
    return res.status(503).json({ error: 'Paid registration is disabled until a verified payment provider is configured' });
  }

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { id: true, captainId: true },
  });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.captainId !== req.user.id) return res.status(403).json({ error: 'Only the team captain can register the team' });

  try {
    const registration = await prisma.$transaction(async (tx) => {
      const created = await tx.tournamentRegistration.create({
        data: { tournamentId: tournament.id, teamId: team.id, status: 'PENDING' },
      });
      await logAction(tx, {
        actorId: req.user.id,
        action: 'TOURNAMENT_REGISTRATION_SUBMITTED',
        entity: 'TournamentRegistration',
        entityId: created.id,
        metadata: { tournamentId: tournament.id, teamId: team.id },
      });
      return created;
    });
    return res.status(201).json(registration);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'This team is already registered for the tournament' });
    }
    throw error;
  }
});

router.get('/:id/registrations', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const prisma = req.app.locals.prisma;
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tournament.id },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          captain: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          members: { select: { user: { select: { id: true, email: true, profile: { select: { displayName: true } } } } } },
        },
      },
    },
    orderBy: { id: 'asc' },
  });
  return res.json(registrations);
});

router.patch('/:id/registrations/:registrationId', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = registrationReviewSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const registration = await prisma.tournamentRegistration.findFirst({
    where: { id: req.params.registrationId, tournamentId: req.params.id },
    include: { tournament: { select: { status: true } } },
  });
  if (!registration) return res.status(404).json({ error: 'Registration not found' });
  if (!['REGISTRATION_OPEN', 'REGISTRATION_CLOSED'].includes(registration.tournament.status)) {
    return res.status(409).json({ error: 'Registrations cannot be reviewed at this stage' });
  }
  if (registration.status !== 'PENDING') {
    return res.status(409).json({ error: 'Registration has already been reviewed' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.tournamentRegistration.update({
      where: { id: registration.id },
      data: { status: input.status },
    });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'REGISTRATION_' + input.status,
      entity: 'TournamentRegistration',
      entityId: changed.id,
      metadata: { tournamentId: req.params.id },
    });
    return changed;
  });
  return res.json(updated);
});

export default router;
