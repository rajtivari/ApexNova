import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate, roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const router = Router();

const authAttemptWindowMs = 15 * 60 * 1000;
const authAttemptLimit = 20;
const authAttempts = new Map();

function limitAuthAttempts(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let attempt = authAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    attempt = { count: 0, resetAt: now + authAttemptWindowMs };
  }
  if (attempt.count >= authAttemptLimit) {
    return res.status(429).json({ error: 'Too many authentication attempts. Try again later.' });
  }
  attempt.count += 1;
  authAttempts.set(key, attempt);

  if (authAttempts.size > 5000) {
    for (const [address, entry] of authAttempts) {
      if (entry.resetAt <= now) authAttempts.delete(address);
    }
  }
  return next();
}

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(40),
});
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'replace-me') return null;
  return secret;
}

function issueToken(user) {
  const secret = getJwtSecret();
  if (!secret) return null;
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '2h', issuer: 'apexnova-api', audience: 'apexnova-web' },
  );
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, profile: user.profile ?? null };
}

router.post('/register', limitAuthAttempts, async (req, res) => {
  const input = registerSchema.parse(req.body);
  if (!getJwtSecret()) return res.status(503).json({ error: 'Authentication is not configured' });

  const prisma = req.app.locals.prisma;
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'PLAYER',
        profile: { create: { displayName: input.displayName } },
        wallet: { create: {} },
      },
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { displayName: true } },
      },
    });

    const accessToken = issueToken(user);
    if (!accessToken) return res.status(503).json({ error: 'Authentication is not configured' });
    return res.status(201).json({ user, accessToken });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    throw error;
  }
});

router.post('/login', limitAuthAttempts, async (req, res) => {
  const input = loginSchema.parse(req.body);
  if (!getJwtSecret()) return res.status(503).json({ error: 'Authentication is not configured' });

  const user = await req.app.locals.prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      profile: { select: { displayName: true } },
    },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = issueToken(user);
  if (!accessToken) return res.status(503).json({ error: 'Authentication is not configured' });
  return res.json({ user: publicUser(user), accessToken });
});


const staffAccountSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(40),
  role: z.enum(['WORKER', 'CAPTAIN']),
});

router.post('/staff', authenticate, roleGuard('SUPER_ADMIN'), async (req, res) => {
  const input = staffAccountSchema.parse(req.body);
  if (!getJwtSecret()) return res.status(503).json({ error: 'Authentication is not configured' });

  const prisma = req.app.locals.prisma;
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
          role: input.role,
          profile: { create: { displayName: input.displayName } },
          wallet: { create: {} },
        },
        select: { id: true, email: true, role: true, profile: { select: { displayName: true } } },
      });
      await logAction(tx, {
        actorId: req.user.id,
        action: 'STAFF_ACCOUNT_CREATED',
        entity: 'User',
        entityId: created.id,
        metadata: { role: input.role },
      });
      return created;
    });
    return res.status(201).json({ user });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'An account with this email already exists' });
    throw error;
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await req.app.locals.prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      profile: { select: { displayName: true } },
    },
  });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  return res.json({ user });
});

export default router;
