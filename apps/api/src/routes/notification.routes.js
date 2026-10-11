import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const notifications = await req.app.locals.prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(notifications);
});

router.patch('/:id/read', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const existing = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'Notification not found' });

  const notification = await prisma.notification.update({
    where: { id: existing.id },
    data: { readAt: new Date() },
  });
  return res.json(notification);
});

export default router;
