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

const app = express();
const prisma = new PrismaClient();
app.locals.prisma = prisma;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({
  service: 'apexnova-api',
  status: 'ok',
  mockOnly: true,
}));

app.use('/api/tournaments', authenticate, tournamentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', authenticate, matchRoutes);
app.use('/api/disputes', authenticate, disputeRoutes);
app.use('/api/wallet', authenticate, walletRoutes);

app.get('/api/docs', (_, res) => res.json({
  openapi: '3.0.0',
  info: { title: 'ApexNova API', version: '1.0.0' },
}));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request', details: error.issues });
  }
  // Do not expose database errors, tokens, or stack traces to clients.
  console.error('API request failed:', error);
  return res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`ApexNova API listening on ${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; closing API server`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
