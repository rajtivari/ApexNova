import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import authRoutes from '../src/routes/auth.routes.js';
import { authenticate } from '../src/middleware/auth.js';
import { hashPassword } from '../src/utils/password.js';

test('registration creates a player account and login issues a valid session', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-with-more-than-thirty-two-characters';
  const users = [];
  let nextId = 1;

  const prisma = {
    $transaction: async (callback) => callback({ user: prisma.user, auditLog: { create: async () => ({}) } }),
    user: {
      async create({ data }) {
        if (users.some((user) => user.email === data.email)) {
          const error = new Error('Unique constraint');
          error.code = 'P2002';
          throw error;
        }
        const user = {
          id: `user-${nextId++}`,
          email: data.email,
          role: data.role,
          passwordHash: data.passwordHash,
          profile: { displayName: data.profile.create.displayName },
        };
        users.push(user);
        return { id: user.id, email: user.email, role: user.role, profile: user.profile };
      },
      async findUnique({ where }) {
        return users.find((user) => user.id === where.id || user.email === where.email) ?? null;
      },
    },
  };

  const app = express();
  app.use(express.json());
  app.locals.prisma = prisma;
  app.use('/api/auth', authRoutes);
  app.get('/protected', authenticate, (req, res) => res.json({ user: req.user }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'Player@Example.com',
      password: 'long-test-password-123',
      displayName: 'Test Player',
      role: 'SUPER_ADMIN',
    }),
  });
  assert.equal(registerResponse.status, 201);
  const registered = await registerResponse.json();
  assert.equal(registered.user.email, 'player@example.com');
  assert.equal(registered.user.role, 'PLAYER');
  assert.equal('passwordHash' in registered.user, false);
  assert.ok(registered.accessToken);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'PLAYER@example.com', password: 'long-test-password-123' }),
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  assert.equal(login.user.role, 'PLAYER');

  const protectedResponse = await fetch(`${baseUrl}/protected`, {
    headers: { authorization: `Bearer ${login.accessToken}` },
  });
  assert.equal(protectedResponse.status, 200);


  const staffEscalationResponse = await fetch(`${baseUrl}/api/auth/staff`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${login.accessToken}` },
    body: JSON.stringify({
      email: 'staff@example.com',
      password: 'long-staff-password-123',
      displayName: 'Attempted Staff',
      role: 'WORKER',
    }),
  });
  assert.equal(staffEscalationResponse.status, 403);

  const wrongPasswordResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'player@example.com', password: 'wrong-password' }),
  });
  assert.equal(wrongPasswordResponse.status, 401);

  const duplicateResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'player@example.com',
      password: 'another-long-test-password',
      displayName: 'Duplicate Player',
    }),
  });
  assert.equal(duplicateResponse.status, 409);
});

test('password hash is not required by route tests', async () => {
  const hash = await hashPassword('long-test-password-123');
  assert.match(hash, /^scrypt\$/);
});
