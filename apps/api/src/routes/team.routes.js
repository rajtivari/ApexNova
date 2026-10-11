import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const teamSchema = z.object({ name: z.string().trim().min(2).max(40) });
const memberSchema = z.object({ userId: z.string().min(1) });

router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const isStaff = ['SUPER_ADMIN', 'WORKER'].includes(req.user.role);
  const teams = await prisma.team.findMany({
    where: isStaff ? {} : {
      OR: [
        { captainId: req.user.id },
        { members: { some: { userId: req.user.id } } },
      ],
    },
    include: {
      captain: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
      members: { include: { user: { select: { id: true, email: true, profile: { select: { displayName: true } } } } } },
    },
    orderBy: { name: 'asc' },
  });
  return res.json(teams);
});

router.post('/', roleGuard('CAPTAIN', 'PLAYER'), async (req, res) => {
  const input = teamSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const existingTeam = await prisma.team.findFirst({
    where: {
      OR: [
        { captainId: req.user.id },
        { members: { some: { userId: req.user.id } } },
      ],
    },
    select: { id: true },
  });
  if (existingTeam) return res.status(409).json({ error: 'You already belong to a team' });

  const team = await prisma.team.create({
    data: { name: input.name, captainId: req.user.id },
  });
  await logAction(prisma, {
    actorId: req.user.id,
    action: 'TEAM_CREATED',
    entity: 'Team',
    entityId: team.id,
  });
  return res.status(201).json(team);
});

router.post('/:teamId/members', roleGuard('CAPTAIN'), async (req, res) => {
  const input = memberSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const team = await prisma.team.findUnique({
    where: { id: req.params.teamId },
    include: { members: { select: { userId: true } } },
  });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.captainId !== req.user.id) return res.status(403).json({ error: 'Only the team captain can manage this roster' });
  if (team.members.length >= 3) return res.status(409).json({ error: 'A squad can have a captain and up to three members' });

  const player = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!player || player.role !== 'PLAYER') return res.status(404).json({ error: 'Player account not found' });
  if (player.id === team.captainId || team.members.some((member) => member.userId === player.id)) {
    return res.status(409).json({ error: 'Player is already on this team' });
  }

  const otherTeam = await prisma.team.findFirst({
    where: {
      OR: [
        { captainId: player.id },
        { members: { some: { userId: player.id } } },
      ],
    },
    select: { id: true },
  });
  if (otherTeam) return res.status(409).json({ error: 'Player already belongs to a team' });

  const member = await prisma.teamMember.create({
    data: { teamId: team.id, userId: player.id },
    include: { user: { select: { id: true, email: true, profile: { select: { displayName: true } } } } },
  });
  await logAction(prisma, {
    actorId: req.user.id,
    action: 'TEAM_MEMBER_ADDED',
    entity: 'TeamMember',
    entityId: member.id,
    metadata: { teamId: team.id, userId: player.id },
  });
  return res.status(201).json(member);
});

router.delete('/:teamId/members/:userId', roleGuard('CAPTAIN'), async (req, res) => {
  const prisma = req.app.locals.prisma;
  const team = await prisma.team.findUnique({
    where: { id: req.params.teamId },
    select: { id: true, captainId: true },
  });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.captainId !== req.user.id) return res.status(403).json({ error: 'Only the team captain can manage this roster' });
  if (req.params.userId === team.captainId) return res.status(400).json({ error: 'The captain cannot be removed from their own team' });

  const member = await prisma.teamMember.findFirst({
    where: { teamId: team.id, userId: req.params.userId },
    select: { id: true },
  });
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  await prisma.teamMember.delete({ where: { id: member.id } });
  await logAction(prisma, {
    actorId: req.user.id,
    action: 'TEAM_MEMBER_REMOVED',
    entity: 'TeamMember',
    entityId: member.id,
    metadata: { teamId: team.id, userId: req.params.userId },
  });
  return res.status(204).end();
});

export default router;
