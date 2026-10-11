import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import tournamentRoutes from './routes/tournament.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import authRoutes from './routes/auth.routes.js';
import matchRoutes from './routes/match.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import { authenticate } from './middleware/auth.js';

if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'replace-me') {
    throw new Error('Production requires a unique JWT_SECRET of at least 32 characters.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Production requires DATABASE_URL.');
  }
  if (!process.env.CORS_ORIGINS?.trim()) {
    throw new Error('Production requires CORS_ORIGINS.');
  }
}

const app = express();
const prisma = new PrismaClient();
app.locals.prisma = prisma;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include health checks and server-to-server calls.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ service: 'apexnova-api', status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ service: 'apexnova-api', status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/tournaments', authenticate, tournamentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', authenticate, matchRoutes);
app.use('/api/disputes', authenticate, disputeRoutes);
app.use('/api/wallet', authenticate, walletRoutes);

app.get('/api/docs', (_, res) => res.json({
  openapi: '3.0.0',
  info: { title: 'ApexNova API', version: '1.0.0' },
  paths: {
    '/api/health': { get: { summary: 'API and database health' } },
    '/api/auth/register': { post: { summary: 'Create a player account' } },
    '/api/auth/login': { post: { summary: 'Sign in' } },
    '/api/auth/me': { get: { summary: 'Get current account' } },
    '/api/tournaments': { get: { summary: 'List tournaments' }, post: { summary: 'Create tournament (staff)' } },
    '/api/matches': { get: { summary: 'List matches' }, post: { summary: 'Create match (staff)' } },
    '/api/disputes': { get: { summary: 'List disputes (staff)' }, post: { summary: 'Open dispute' } },
    '/api/notifications': { get: { summary: 'List current user notifications' } },
    '/api/wallet/{userId}': { get: { summary: 'Read wallet (super admin)' } },
  },
}));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request', details: error.issues });
  }
  if (error.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error('API request failed:', error);
  return res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`ApexNova API listening on ${port}`));

let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; closing API server`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
