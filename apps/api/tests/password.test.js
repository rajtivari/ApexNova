import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

test('password hashes are salted and can be verified', async () => {
  const password = 'correct-horse-battery-staple';
  const first = await hashPassword(password);
  const second = await hashPassword(password);

  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});

test('malformed password hashes are rejected safely', async () => {
  assert.equal(await verifyPassword('anything', ''), false);
  assert.equal(await verifyPassword('anything', 'bcrypt$invalid$invalid'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$zz$zz'), false);
});
