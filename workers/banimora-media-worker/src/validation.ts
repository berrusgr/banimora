import { WorkerHttpError } from './auth.ts';

export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
]);

export function normalizeMimeType(rawMime: string | null | undefined): string {
  if (!rawMime) return '';
  return rawMime.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(normalizeMimeType(mimeType));
}

export function resolveMaxUploadBytes(rawValue?: string): number {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_MAX_UPLOAD_BYTES;
}

export async function computeSha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Kullanıcı kimliği ve gerçek içerik SHA-256'sından Worker kontrollü anahtar üretir.
 * İstemcinin gönderdiği key veya ownerId hiçbir zaman kabul edilmez.
 */
export function buildUserAssetObjectKey(userId: string, sha256Hex: string): string {
  const safeUserId = userId.trim();
  const safeHash = sha256Hex.trim().toLowerCase();
  if (!safeUserId || !/^[a-f0-9]{64}$/.test(safeHash)) {
    throw new WorkerHttpError(400, 'INVALID_ASSET_KEY', 'Geçersiz dosya özeti veya kullanıcı kimliği.');
  }
  return `users/${safeUserId}/assets/${safeHash}`;
}

export function assertObjectKeyOwnedByUser(objectKey: string, userId: string): string {
  const trimmed = objectKey.trim();
  const expectedPrefix = `users/${userId.trim()}/assets/`;
  if (!trimmed.startsWith(expectedPrefix)) {
    throw new WorkerHttpError(
      403,
      'FORBIDDEN_ASSET_KEY',
      'Yalnızca kendi medya dosyalarınız için erişim bağlantısı oluşturabilirsiniz.'
    );
  }
  const hashPart = trimmed.slice(expectedPrefix.length);
  if (!/^[a-f0-9]{64}$/.test(hashPart)) {
    throw new WorkerHttpError(400, 'INVALID_ASSET_KEY', 'Geçersiz medya anahtarı biçimi.');
  }
  return trimmed;
}
