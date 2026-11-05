import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { encryptionReady, encryptText, decryptText } from '../utils/secureData.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const withdrawSchema = z.object({
  amount: z.number().finite().positive().max(1_000_000),
  upiVpa: z.string().trim().min(5).max(100).regex(/^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,64}$/),
});
const maskVpa = (value) => {
  const [name, domain] = value.split('@');
  return (name.slice(0, 2) + '***@' + domain);
};

router.get('/me', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const wallet = await prisma.wallet.upsert({
    where: { userId: req.user.id },
    update: {},
    create: { userId: req.user.id },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  return res.json({ balance: wallet.balance, transactions: wallet.transactions });
});

router.post('/withdraw', async (req, res) => {
  const input = withdrawSchema.parse(req.body);
  if (!encryptionReady()) return res.status(503).json({ error: 'Secure payout details are not configured' });
  const prisma = req.app.locals.prisma;
  const kyc = await prisma.kyc.findUnique({ where: { userId: req.user.id }, select: { status: true } });
  if (kyc?.status !== 'APPROVED') return res.status(403).json({ error: 'Complete approved identity and age verification before requesting a payout' });

  const result = await prisma.$transaction(async (tx) => {
    const reserved = await tx.wallet.updateMany({
      where: { userId: req.user.id, balance: { gte: input.amount } },
      data: { balance: { decrement: input.amount } },
    });
    if (reserved.count !== 1) return null;
    const updatedWallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
    const transaction = await tx.transaction.create({
      data: { userId: req.user.id, walletId: updatedWallet.id, type: 'WITHDRAWAL', amount: input.amount, status: 'PENDING' },
    });
    const request = await tx.withdrawalRequest.create({
      data: {
        userId: req.user.id,
        transactionId: transaction.id,
        amount: input.amount,
        encryptedDestination: encryptText(input.upiVpa),
        maskedDestination: maskVpa(input.upiVpa),
      },
      select: { id: true, amount: true, maskedDestination: true, status: true, createdAt: true },
    });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'WALLET_WITHDRAWAL_REQUESTED',
      entity: 'WithdrawalRequest',
      entityId: request.id,
      metadata: { amount: input.amount, maskedDestination: request.maskedDestination },
    });
    return { request, balance: updatedWallet.balance };
  });
  if (!result) return res.status(409).json({ error: 'Your approved prize balance is too low for this payout' });
  return res.status(201).json(result);
});

router.get('/pending', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  if (!encryptionReady()) return res.status(503).json({ error: 'Secure payout details are not configured' });
  const rows = await req.app.locals.prisma.withdrawalRequest.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { email: true, profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(rows.map((row) => ({
    id: row.id, amount: row.amount, maskedDestination: row.maskedDestination,
    payoutDestination: decryptText(row.encryptedDestination), createdAt: row.createdAt,
    user: row.user,
  })));
});

router.patch('/withdrawals/:id', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = z.object({ status: z.enum(['PAID', 'REJECTED']) }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const outcome = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({
      where: { id: req.params.id },
      include: { transaction: true },
    });
    if (!request) return { error: 'not-found' };
    if (request.status !== 'PENDING') return { error: 'reviewed' };
    const updated = await tx.withdrawalRequest.update({
      where: { id: request.id },
      data: { status: input.status, reviewedAt: new Date(), reviewedById: req.user.id },
    });
    await tx.transaction.update({
      where: { id: request.transactionId },
      data: { status: input.status === 'PAID' ? 'COMPLETED' : 'REJECTED' },
    });
    let balance = null;
    if (input.status === 'REJECTED') {
      const wallet = await tx.wallet.update({
        where: { userId: request.userId },
        data: { balance: { increment: request.amount } },
      });
      balance = wallet.balance;
    }
    await logAction(tx, {
      actorId: req.user.id,
      action: 'WALLET_WITHDRAWAL_' + input.status,
      entity: 'WithdrawalRequest',
      entityId: request.id,
      metadata: { amount: Number(request.amount), userId: request.userId },
    });
    return { request: updated, balance };
  });
  if (outcome.error === 'not-found') return res.status(404).json({ error: 'Withdrawal request not found' });
  if (outcome.error === 'reviewed') return res.status(409).json({ error: 'Withdrawal request has already been reviewed' });
  return res.json(outcome);
});

router.post('/prizes', roleGuard('SUPER_ADMIN'), async (req, res) => {
  const input = z.object({
    resultId: z.string().min(1),
    amount: z.number().finite().positive().max(100_000_000),
  }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const result = await prisma.matchResult.findUnique({
    where: { id: input.resultId },
    include: {
      team: { select: { id: true, name: true, captainId: true } },
      match: { select: { tournamentId: true, tournament: { select: { prizePool: true, name: true } } } },
    },
  });
  if (!result) return res.status(404).json({ error: 'Match result not found' });
  if (result.status !== 'APPROVED') return res.status(409).json({ error: 'Only an approved result can receive a wallet prize' });
  const reference = 'prize:' + result.match.tournamentId + ':' + result.id;
  const transaction = await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUnique({ where: { reference }, select: { id: true } });
    if (existing) return { error: 'awarded' };
    const allocated = await tx.transaction.aggregate({
      where: { type: 'PRIZE_PAYOUT', status: 'COMPLETED', reference: { startsWith: 'prize:' + result.match.tournamentId + ':' } },
      _sum: { amount: true },
    });
    const remaining = Number(result.match.tournament.prizePool) - Number(allocated._sum.amount || 0);
    if (input.amount > remaining) return { error: 'over-pool' };
    const wallet = await tx.wallet.upsert({
      where: { userId: result.team.captainId },
      update: { balance: { increment: input.amount } },
      create: { userId: result.team.captainId, balance: input.amount },
    });
    const created = await tx.transaction.create({
      data: { userId: result.team.captainId, walletId: wallet.id, type: 'PRIZE_PAYOUT', amount: input.amount, status: 'COMPLETED', reference },
    });
    await logAction(tx, {
      actorId: req.user.id,
      action: 'WALLET_PRIZE_CREDITED',
      entity: 'Transaction',
      entityId: created.id,
      metadata: { resultId: result.id, teamId: result.team.id, amount: input.amount },
    });
    return { transaction: created, team: result.team.name, balance: wallet.balance };
  });
  if (transaction.error === 'awarded') return res.status(409).json({ error: 'A prize was already credited for this result' });
  if (transaction.error === 'over-pool') return res.status(409).json({ error: 'This prize would exceed the tournament prize pool' });
  return res.status(201).json(transaction);
});

router.get('/:userId', roleGuard('SUPER_ADMIN'), async (req, res) => {
  const wallet = await req.app.locals.prisma.wallet.findUnique({
    where: { userId: req.params.userId },
    include: { transactions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  return res.json(wallet);
});

export default router;
