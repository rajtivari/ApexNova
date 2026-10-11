import { Router } from 'express';
import { z } from 'zod';
import { moneyRouteGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const amountSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().finite().positive().max(1_000_000),
});
router.use(moneyRouteGuard);

router.post('/deposit', async (req, res) => {
  const input = amountSchema.parse(req.body);
  const prisma = req.app.locals.prisma;

  const outcome = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) return null;

    const wallet = await tx.wallet.upsert({
      where: { userId: input.userId },
      update: { balance: { increment: input.amount } },
      create: { userId: input.userId, balance: input.amount },
    });
    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        walletId: wallet.id,
        amount: input.amount,
        type: 'DEPOSIT',
        status: 'COMPLETED',
      },
    });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'MOCK_DEPOSIT',
      entity: 'Transaction',
      entityId: transaction.id,
      metadata: { amount: input.amount, mockOnly: true },
    });
    return { wallet, transaction };
  });

  if (!outcome) return res.status(404).json({ error: 'User not found' });
  return res.status(201).json({ ...outcome, mockOnly: true });
});

router.get('/:userId', async (req, res) => {
  const wallet = await req.app.locals.prisma.wallet.findUnique({
    where: { userId: req.params.userId },
    include: { transactions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  return res.json(wallet);
});

export default router;
