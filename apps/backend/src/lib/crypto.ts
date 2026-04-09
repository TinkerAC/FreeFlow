import crypto from 'node:crypto';

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function createRequestId() {
  return crypto.randomUUID();
}
