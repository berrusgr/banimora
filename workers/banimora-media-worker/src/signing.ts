const TEXT_ENCODER = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function signReadTarget(
  objectKey: string,
  expiresAtUnixSec: number,
  secret: string
): Promise<string> {
  const key = await importHmacKey(secret);
  const message = `${objectKey}:${expiresAtUnixSec}`;
  const sigBuffer = await crypto.subtle.sign('HMAC', key, TEXT_ENCODER.encode(message));
  return toBase64Url(new Uint8Array(sigBuffer));
}

export interface VerifyReadSignatureResult {
  valid: boolean;
  reason?: 'INVALID_EXP' | 'EXPIRED' | 'INVALID_SIGNATURE';
  expiresAtUnixSec?: number;
  remainingTtlSec?: number;
}

export async function verifyReadSignature(
  objectKey: string,
  expParam: string | null,
  sigParam: string | null,
  secret: string,
  nowUnixSec: number = Math.floor(Date.now() / 1000)
): Promise<VerifyReadSignatureResult> {
  if (!expParam || !sigParam) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  const parsedExp = Number(expParam);
  if (!Number.isInteger(parsedExp) || parsedExp <= 0) {
    return { valid: false, reason: 'INVALID_EXP' };
  }

  if (parsedExp <= nowUnixSec) {
    return { valid: false, reason: 'EXPIRED', expiresAtUnixSec: parsedExp };
  }

  const expectedSig = await signReadTarget(objectKey, parsedExp, secret);
  if (!constantTimeEqual(sigParam, expectedSig)) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  return {
    valid: true,
    expiresAtUnixSec: parsedExp,
    remainingTtlSec: Math.max(1, parsedExp - nowUnixSec),
  };
}

export function buildSignedReadUrl(
  requestUrl: string,
  objectKey: string,
  expiresAtUnixSec: number,
  signature: string
): string {
  const origin = new URL(requestUrl).origin;
  const encodedKey = encodeURIComponent(objectKey);
  return `${origin}/assets/r/${encodedKey}?exp=${expiresAtUnixSec}&sig=${encodeURIComponent(signature)}`;
}
