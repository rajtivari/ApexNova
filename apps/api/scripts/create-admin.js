import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME } = process.env;
const email = ADMIN_EMAIL?.trim().toLowerCase();
const displayName = ADMIN_DISPLAY_NAME?.trim();

if (!email || !displayName || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 128) {
  console.error('Set ADMIN_EMAIL, ADMIN_DISPLAY_NAME, and ADMIN_PASSWORD (12-128 characters) in the environment.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace-me') {
  console.error('Set a unique JWT_SECRET of at least 32 characters before creating an admin.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      profile: { create: { displayName } },
      wallet: { create: {} },
    },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      profile: { upsert: { create: { displayName }, update: { displayName } } },
      wallet: { upsert: { create: {}, update: {} } },
    },
    select: { id: true, email: true, role: true },
  });
  console.log(`Super admin ready: ${user.email} (${user.id})`);
} catch (error) {
  console.error('Could not create the super admin:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
