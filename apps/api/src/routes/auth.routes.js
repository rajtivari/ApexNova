import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const loginSchema = z.object({ email: z.string().email(), role: z.enum(['SUPER_ADMIN', 'WORKER', 'CAPTAIN', 'PLAYER']).default('PLAYER') });
router.post('/demo-login', (req, res) => { const input = loginSchema.parse(req.body); const user = { id: `demo-${input.role.toLowerCase()}`, email: input.email, role: input.role }; const accessToken = jwt.sign(user, process.env.JWT_SECRET || 'development-secret', { expiresIn: '2h' }); res.json({ user, accessToken, mockOnly: true }); });
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
export default router;
