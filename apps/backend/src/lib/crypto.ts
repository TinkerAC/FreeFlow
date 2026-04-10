import crypto from 'node:crypto';

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
