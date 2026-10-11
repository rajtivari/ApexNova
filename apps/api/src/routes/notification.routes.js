import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const notifications = await req.app.locals.prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { readAt: 'desc' },
  });
  res.json(notifications);
});

router.patch('/:id/read', async (req, res) => {
  const notification = await req.app.locals.prisma.notification.update({
    where: { id: req.params.id, userId: req.user.id },
    data: { readAt: new Date() },
  });
  res.json(notification);
});

export default router;
