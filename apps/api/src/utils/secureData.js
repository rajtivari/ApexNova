import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey() {
  const encoded = process.env.DATA_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(encoded)) throw new Error('DATA_ENCRYPTION_KEY must be a 32-byte hex value');
  return Buffer.from(encoded, 'hex');
}

export function encryptionReady() {
  return /^[a-fA-F0-9]{64}$/.test(process.env.DATA_ENCRYPTION_KEY || '');
}

export function encryptBuffer(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([Buffer.from('ANV1'), iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBuffer(value) {
  if (value.length < 32 || value.subarray(0, 4).toString() !== 'ANV1') throw new Error('Encrypted data format is invalid');
  const iv = value.subarray(4, 16);
  const tag = value.subarray(16, 32);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(value.subarray(32)), decipher.final()]);
}

export function encryptText(value) {
  return encryptBuffer(Buffer.from(value, 'utf8')).toString('base64');
}

export function decryptText(value) {
  return decryptBuffer(Buffer.from(value, 'base64')).toString('utf8');
}
