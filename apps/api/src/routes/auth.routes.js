import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const loginSchema = z.object({
  email: z.string().email(),
  role: z.enum(['SUPER_ADMIN', 'WORKER', 'CAPTAIN', 'PLAYER']).default('PLAYER'),
});

router.post('/demo-login', (req, res) => {
  // This endpoint grants the caller the requested role. It is for local demos only.
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_AUTH !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'replace-me') {
    return res.status(503).json({ error: 'Demo authentication is not configured' });
  }

  const input = loginSchema.parse(req.body);
  const user = {
    id: `demo-${input.role.toLowerCase()}`,
    email: input.email,
    role: input.role,
  };
  const accessToken = jwt.sign(user, secret, { expiresIn: '2h' });

  return res.json({ user, accessToken, mockOnly: true });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

export default router;
