import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { roleGuard } from '../middleware/auth.js';
import { encryptionReady, encryptBuffer, decryptBuffer } from '../utils/secureData.js';
import { logAction } from '../utils/auditLog.js';

const router = Router();
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const imageSchema = z.object({
  dataUrl: z.string().min(32).max(3_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});
const submissionSchema = z.object({
  consent: z.literal(true),
  selfie: imageSchema,
  aadhaarImage: imageSchema,
});

function enabled() {
  return process.env.KYC_UPLOADS_ENABLED === 'true'
    && Boolean(process.env.UIDAI_OVSE_ID)
    && Boolean(process.env.KYC_PRIVATE_STORAGE_DIR)
    && encryptionReady();
}
function documentBytes(input) {
  const prefix = 'data:' + input.mimeType + ';base64,';
  if (!input.dataUrl.startsWith(prefix)) throw new Error('Choose a JPEG or PNG image.');
  const value = input.dataUrl.slice(prefix.length);
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Each image must be 2 MB or smaller.');
  const valid = input.mimeType === 'image/jpeg'
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) throw new Error('The image content does not match its file type.');
  return bytes;
}
function storageDirectory() {
  return path.resolve(process.env.KYC_PRIVATE_STORAGE_DIR);
}
async function writeEncrypted(name, bytes) {
  const directory = storageDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const documentKey = name + '-' + randomUUID() + '.enc';
  await writeFile(path.join(directory, documentKey), encryptBuffer(bytes), { flag: 'wx', mode: 0o600 });
  return documentKey;
}
async function removeEncrypted(documentKey) {
  if (!documentKey || !/^[a-z-]+-[0-9a-f-]+\.enc$/.test(documentKey)) return;
  try { await unlink(path.join(storageDirectory(), documentKey)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function readEncrypted(documentKey) {
  if (!/^[a-z-]+-[0-9a-f-]+\.enc$/.test(documentKey)) throw new Error('Invalid document key');
  const bytes = await readFile(path.join(storageDirectory(), documentKey));
  return decryptBuffer(bytes);
}

router.post('/me', async (req, res) => {
  if (!enabled()) return res.status(503).json({ error: 'Secure identity verification is not configured on this server' });
  const input = submissionSchema.parse(req.body);

  let selfie, aadhaarImage;
  try {
    selfie = documentBytes(input.selfie);
    aadhaarImage = documentBytes(input.aadhaarImage);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const prisma = req.app.locals.prisma;
  const prior = await prisma.kyc.findUnique({ where: { userId: req.user.id } });
  if (prior?.status === 'APPROVED') return res.status(409).json({ error: 'Identity verification is already approved' });
  let selfieKey, aadhaarKey;
  try {
    selfieKey = await writeEncrypted('selfie', selfie);
    aadhaarKey = await writeEncrypted('aadhaar', aadhaarImage);
  } catch (error) {
    console.error('KYC document storage failed:', error);
    return res.status(503).json({ error: 'Secure document storage is unavailable' });
  }
  const kyc = await prisma.kyc.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, selfieDocumentKey: selfieKey, aadhaarDocumentKey: aadhaarKey, selfieMimeType: input.selfie.mimeType, aadhaarMimeType: input.aadhaarImage.mimeType, status: 'PENDING' },
    update: { selfieDocumentKey: selfieKey, aadhaarDocumentKey: aadhaarKey, selfieMimeType: input.selfie.mimeType, aadhaarMimeType: input.aadhaarImage.mimeType, status: 'PENDING', reviewedAt: null, reviewedById: null, reviewNote: null, ageVerified: false, encryptedAadhaar: null, maskedAadhaar: null },
    select: { status: true, ageVerified: true, reviewedAt: true, reviewNote: true },
  });
  await logAction(prisma, { actorId: req.user.id, action: 'KYC_SUBMITTED', entity: 'Kyc', entityId: req.user.id, metadata: { documents: ['selfie', 'masked_aadhaar_image'] } });
  return res.status(202).json(kyc);
});

router.get('/me', async (req, res) => {
  const kyc = await req.app.locals.prisma.kyc.findUnique({
    where: { userId: req.user.id },
    select: { status: true, ageVerified: true, reviewedAt: true, reviewNote: true },
  });
  return res.json(kyc || { status: 'NOT_SUBMITTED' });
});

router.get('/admin', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const rows = await req.app.locals.prisma.kyc.findMany({
    select: { userId: true, status: true, selfieDocumentKey: true, aadhaarDocumentKey: true, reviewedAt: true, reviewNote: true, user: { select: { email: true, profile: { select: { displayName: true } } } } },
    orderBy: [{ status: 'asc' }, { userId: 'asc' }],
  });
  return res.json(rows.map((row) => ({ userId: row.userId, status: row.status, hasSelfie: Boolean(row.selfieDocumentKey), hasAadhaarImage: Boolean(row.aadhaarDocumentKey), reviewedAt: row.reviewedAt, reviewNote: row.reviewNote, user: row.user })));
});

router.get('/:userId/documents/:kind', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  if (!enabled()) return res.status(503).json({ error: 'Secure identity verification is not configured on this server' });
  if (!['selfie', 'aadhaar'].includes(req.params.kind)) return res.status(404).json({ error: 'Document not found' });
  const kyc = await req.app.locals.prisma.kyc.findUnique({ where: { userId: req.params.userId }, select: { selfieDocumentKey: true, aadhaarDocumentKey: true, selfieMimeType: true, aadhaarMimeType: true } });
  const key = req.params.kind === 'selfie' ? kyc?.selfieDocumentKey : kyc?.aadhaarDocumentKey;
  const mimeType = req.params.kind === 'selfie' ? kyc?.selfieMimeType : kyc?.aadhaarMimeType;
  if (!key || !mimeType) return res.status(404).json({ error: 'Document not found' });
  let image;
  try { image = await readEncrypted(key); } catch { return res.status(404).json({ error: 'Document unavailable' }); }
  await logAction(req.app.locals.prisma, { actorId: req.user.id, action: 'KYC_DOCUMENT_VIEWED', entity: 'Kyc', entityId: req.params.userId, metadata: { document: req.params.kind } });
  res.set({ 'Content-Type': mimeType, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' });
  return res.send(image);
});

router.patch('/:userId/review', roleGuard('SUPER_ADMIN', 'WORKER'), async (req, res) => {
  const input = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(500).optional() }).parse(req.body);
  const prisma = req.app.locals.prisma;
  const current = await prisma.kyc.findUnique({ where: { userId: req.params.userId } });
  if (!current) return res.status(404).json({ error: 'Verification request not found' });
  if (!current.selfieDocumentKey || !current.aadhaarDocumentKey) return res.status(409).json({ error: 'Both images are required before review' });
  if (input.status === 'REJECTED' && !input.note) return res.status(400).json({ error: 'Add a reason when rejecting verification' });
  const updated = await prisma.kyc.update({
    where: { userId: current.userId },
    data: {
      status: input.status,
      ageVerified: input.status === 'APPROVED',
      selfieDocumentKey: null,
      aadhaarDocumentKey: null,
      selfieMimeType: null,
      aadhaarMimeType: null,
      reviewedAt: new Date(),
      reviewedById: req.user.id,
      reviewNote: input.note || null,
    },
    select: { userId: true, status: true, ageVerified: true, reviewedAt: true, reviewNote: true },
  });
  await Promise.all([removeEncrypted(current.selfieDocumentKey), removeEncrypted(current.aadhaarDocumentKey)]);
  await logAction(prisma, { actorId: req.user.id, action: 'KYC_' + input.status, entity: 'Kyc', entityId: updated.userId });
  return res.json(updated);
});

export default router;
