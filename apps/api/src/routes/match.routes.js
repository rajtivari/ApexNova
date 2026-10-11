import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';
import { recalculateStandings, scoreResult } from '../services/standings.service.js';

const router = Router();
const matchSchema = z.object({
  tournamentId: z.string().min(1),
  round: z.string().trim().min(1).max(80),
  scheduledAt: z.coerce.date(),
  roomId: z.string().trim().max(120).optional(),
  roomPassword: z.string().max(120).optional(),
});
const resultSchema = z.object({
  teamId: z.string().min(1),
  kills: z.number().int().nonnegative().max(100),
  placement: z.number().int().positive().max(100),
  proofUrl: z.string().url().max(2048),
});

router.get('/', async (req, res) => {
  const matches = await req.app.locals.prisma.match.findMany({
    select: {
      id: true,
      tournamentId: true,
      round: true,
      scheduledAt: true,
      results: {
        select: {
          id: true,
          teamId: true,
          kills: true,
          placement: true,
          status: true,
          killPoints: true,
          placementPoints: true,
          totalPoints: true,
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  return res.json(matches);
});

router.post('/', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const data = matchSchema.parse(req.body);
  const tournament = await req.app.locals.prisma.tournament.findUnique({
    where: { id: data.tournamentId },
    select: { id: true, status: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  if (['COMPLETED', 'CANCELLED'].includes(tournament.status)) {
    return res.status(409).json({ error: 'Cannot schedule a match for this tournament' });
  }

  const match = await req.app.locals.prisma.$transaction(async (tx) => {
    const created = await tx.match.create({ data });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'CREATE',
      entity: 'Match',
      entityId: created.id,
    });
    return created;
  });
  return res.status(201).json({
    id: match.id,
    tournamentId: match.tournamentId,
    round: match.round,
    scheduledAt: match.scheduledAt,
  });
});

router.get('/:id/room', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { tournament: { select: { status: true } } },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const isStaff = ['SUPER_ADMIN', 'WORKER'].includes(req.user.role);
  if (!isStaff) {
    const registration = await prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId: match.tournamentId,
        status: 'APPROVED',
        team: {
          OR: [
            { captainId: req.user.id },
            { members: { some: { userId: req.user.id } } },
          ],
        },
      },
      select: { id: true },
    });
    if (!registration) return res.status(403).json({ error: 'Approved team registration required' });
    if (match.tournament.status !== 'LIVE') {
      return res.status(409).json({ error: 'Room details are available only during live tournaments' });
    }
  }

  return res.json({ id: match.id, roomId: match.roomId, roomPassword: match.roomPassword });
});

router.post('/:id/results', roleGuard('CAPTAIN', 'PLAYER'), async (req, res) => {
  const input = resultSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    select: { id: true, tournamentId: true, tournament: { select: { status: true } } },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.tournament.status !== 'LIVE') {
    return res.status(409).json({ error: 'Results can be submitted only while the tournament is live' });
  }

  const registration = await prisma.tournamentRegistration.findFirst({
    where: {
      tournamentId: match.tournamentId,
      teamId: input.teamId,
      status: 'APPROVED',
      team: {
        OR: [
          { captainId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
    },
    select: { id: true },
  });
  if (!registration) return res.status(403).json({ error: 'You must belong to an approved team in this tournament' });

  const points = scoreResult(input);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.matchResult.create({
        data: { ...input, matchId: match.id, submittedById: req.user.id, ...points },
      });
      await logAction(tx, {
        actorId: req.user.id,
        action: 'RESULT_SUBMITTED',
        entity: 'MatchResult',
        entityId: created.id,
      });
      return created;
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A result for this team and match already exists' });
    throw error;
  }
});

router.patch('/results/:resultId', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const existing = await prisma.matchResult.findUnique({
    where: { id: req.params.resultId },
    select: { id: true, matchId: true },
  });
  if (!existing) return res.status(404).json({ error: 'Result not found' });

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.matchResult.update({
      where: { id: existing.id },
      data: { status: input.status, reviewedAt: new Date() },
    });
    const match = await tx.match.findUnique({
      where: { id: updated.matchId },
      select: { tournamentId: true },
    });
    if (match) await recalculateStandings(tx, match.tournamentId);
    await logAction(tx, {
      actorId: req.user.id,
      action: 'RESULT_' + input.status,
      entity: 'MatchResult',
      entityId: updated.id,
    });
    return updated;
  });

  return res.json(result);
});

export default router;
