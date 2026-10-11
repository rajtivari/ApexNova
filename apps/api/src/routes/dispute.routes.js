import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const disputeSchema = z.object({
  matchId: z.string().min(1),
  resultId: z.string().min(1),
  reason: z.string().trim().min(10).max(2000),
  evidenceUrl: z.string().url().max(2048).optional(),
});

router.get('/', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const disputes = await req.app.locals.prisma.dispute.findMany({
    include: {
      result: { select: { teamId: true, kills: true, placement: true, proofUrl: true, status: true } },
    },
    orderBy: { status: 'asc' },
  });
  return res.json(disputes);
});

router.post('/', roleGuard('CAPTAIN', 'PLAYER'), async (req, res) => {
  const input = disputeSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const result = await prisma.matchResult.findUnique({
    where: { id: input.resultId },
    select: { id: true, matchId: true, teamId: true, match: { select: { tournamentId: true } } },
  });
  if (!result || result.matchId !== input.matchId) {
    return res.status(404).json({ error: 'Match result not found' });
  }

  const registration = await prisma.tournamentRegistration.findFirst({
    where: {
      tournamentId: result.match.tournamentId,
      teamId: result.teamId,
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
  if (!registration) return res.status(403).json({ error: 'Only an approved participating team can dispute this result' });

  const existingOpenDispute = await prisma.dispute.findFirst({
    where: { resultId: result.id, status: 'OPEN' },
    select: { id: true },
  });
  if (existingOpenDispute) return res.status(409).json({ error: 'This result already has an open dispute' });

  const dispute = await prisma.dispute.create({
    data: {
      matchId: result.matchId,
      resultId: result.id,
      openedById: req.user.id,
      reason: input.reason,
      evidenceUrl: input.evidenceUrl,
    },
  });
  await logAction(prisma, {
    actorId: req.user.id,
    action: 'DISPUTE_OPENED',
    entity: 'Dispute',
    entityId: dispute.id,
  });
  return res.status(201).json(dispute);
});

router.patch('/:id', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = z.object({
    status: z.enum(['RESOLVED', 'REJECTED']),
    resolutionNote: z.string().trim().max(2000).optional(),
  }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const existing = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true },
  });
  if (!existing) return res.status(404).json({ error: 'Dispute not found' });
  if (existing.status !== 'OPEN') return res.status(409).json({ error: 'Dispute is already closed' });

  const dispute = await prisma.dispute.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      resolutionNote: input.resolutionNote ?? null,
      resolvedAt: input.status === 'RESOLVED' ? new Date() : null,
    },
  });
  await logAction(prisma, {
    actorId: req.user.id,
    action: `DISPUTE_${input.status}`,
    entity: 'Dispute',
    entityId: dispute.id,
    metadata: { resolutionNote: input.resolutionNote ?? null },
  });
  return res.json(dispute);
});

export default router;
