import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
router.get('/', async (req, res) => res.json(await req.app.locals.prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })));
router.patch('/:id/read', async (req, res) => res.json(await req.app.locals.prisma.notification.update({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } })));
export default router;
