import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const disputeSchema = z.object({
  matchId: z.string(),
  resultId: z.string(),
  reason: z.string().min(10),
  evidenceUrl: z.string().url().optional(),
});

router.get('/', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const disputes = await req.app.locals.prisma.dispute.findMany({
    orderBy: { status: 'asc' },
  });
  res.json(disputes);
});

router.post('/', roleGuard('CAPTAIN', 'PLAYER'), async (req, res) => {
  const data = disputeSchema.parse(req.body);
  const dispute = await req.app.locals.prisma.dispute.create({
    data: { ...data, openedById: req.user.id },
  });
  res.status(201).json(dispute);
});

router.patch('/:id', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const data = z.object({
    status: z.enum(['RESOLVED', 'REJECTED']),
  }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const dispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data,
  });
  await logAction(prisma, {
    actorId: req.user.id,
    action: `DISPUTE_${data.status}`,
    entity: 'Dispute',
    entityId: dispute.id,
  });
  res.json(dispute);
});

export default router;
