import { Router } from 'express';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';
const router = Router();
const tournamentSchema = z.object({ name: z.string().min(2), game: z.enum(['FREE_FIRE', 'BGMI']), format: z.enum(['BATTLE_ROYALE', 'ROUND_ROBIN', 'SINGLE_ELIMINATION']), entryFee: z.number().nonnegative().default(0), prizePool: z.number().nonnegative().default(0), startsAt: z.coerce.date(), registrationClosesAt: z.coerce.date() });
/** @openapi
 * /api/tournaments: get: {summary: List tournaments, responses: {'200': {description: OK}}}
 */
router.get('/', async (req, res) => res.json(await req.app.locals.prisma.tournament.findMany({ orderBy: { startsAt: 'asc' } })));
router.post('/', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => { const data = tournamentSchema.parse(req.body); const tournament = await req.app.locals.prisma.tournament.create({ data }); await logAction(req.app.locals.prisma, { actorId: req.user.id, action: 'CREATE', entity: 'Tournament', entityId: tournament.id }); res.status(201).json(tournament); });
router.patch('/:id/status', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => { const data = z.object({ status: z.enum(['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'CANCELLED']) }).parse(req.body); const tournament = await req.app.locals.prisma.tournament.update({ where: { id: req.params.id }, data }); await logAction(req.app.locals.prisma, { actorId: req.user.id, action: 'STATUS_CHANGE', entity: 'Tournament', entityId: tournament.id, metadata: data }); res.json(tournament); });
export default router;
