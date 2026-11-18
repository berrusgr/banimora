import { CloudRepositoryError, mapSupabaseErrorToCloudError } from './cloudRepositoryError.ts';
import { getSupabaseClient } from './supabaseClient.ts';

export interface R2MediaEnvSource {
  VITE_MEDIA_WORKER_URL?: string;
}

export interface R2UploadResult {
  ok: true;
  deduplicated: boolean;
  objectKey: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
}

export interface R2SignedReadResult {
  objectKey: string;
  url: string;
  expiresAt: string;
  ttlSeconds: number;
}

export type R2FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export interface R2MediaClientOptions {
  workerUrl?: string;
  getAccessToken: () => Promise<string | null>;
  fetchFn?: R2FetchLike;
  nowMs?: () => number;
}

function readWorkerRuntimeEnv(): R2MediaEnvSource {
  const metaEnv =
    typeof import.meta !== 'undefined' &&
    typeof (import.meta as unknown as { env?: unknown }).env === 'object'
      ? ((import.meta as unknown as { env?: R2MediaEnvSource }).env ?? {})
      : {};
  return {
    VITE_MEDIA_WORKER_URL: metaEnv.VITE_MEDIA_WORKER_URL,
  };
}

export function getMediaWorkerUrl(
  envSource: R2MediaEnvSource = readWorkerRuntimeEnv()
): string | null {
  const raw =
    typeof envSource.VITE_MEDIA_WORKER_URL === 'string'
      ? envSource.VITE_MEDIA_WORKER_URL.trim()
      : '';
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

export function isR2MediaConfigured(envSource?: R2MediaEnvSource): boolean {
  return getMediaWorkerUrl(envSource) !== null;
}

export async function computeBlobSha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function mapWorkerHttpStatusToCloudError(
  status: number,
  body: Record<string, unknown>,
  fallbackMessage: string
): CloudRepositoryError {
  const code = typeof body.code === 'string' ? body.code : '';
  const serverMessage =
    typeof body.error === 'string' && body.error.trim()
      ? body.error.trim()
      : fallbackMessage;

  if (status === 401 || code === 'AUTH_REQUIRED' || code === 'INVALID_TOKEN') {
    return new CloudRepositoryError('AUTH_REQUIRED', serverMessage, { status, code });
  }
  if (status === 403 || code === 'FORBIDDEN_ASSET_KEY') {
    return new CloudRepositoryError('PERMISSION_DENIED', serverMessage, { status, code });
  }
  if (status === 404 || code === 'ASSET_NOT_FOUND') {
    return new CloudRepositoryError('NOT_FOUND', serverMessage, { status, code });
  }
  if (status === 413 || code === 'FILE_TOO_LARGE') {
    return new CloudRepositoryError('PAYLOAD_TOO_LARGE', serverMessage, { status, code });
  }
  if (
    status === 400 ||
    status === 415 ||
    code === 'UNSUPPORTED_MEDIA_TYPE' ||
    code === 'HASH_MISMATCH'
  ) {
    return new CloudRepositoryError('VALIDATION_ERROR', serverMessage, { status, code });
  }
  return new CloudRepositoryError('UNKNOWN', serverMessage, { status, code });
}

/**
 * Cloudflare R2 Media Worker (`banimora-media-worker`) ile güvenli yükleme ve
 * kısa ömürlü imzalı okuma URL'si alma istemcisi.
 * R2 secret veya service_role anahtarı kullanmaz; yalnızca Supabase JWT taşır.
 */
export class R2MediaClient {
  private readonly workerUrl: string;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly fetchFn: R2FetchLike;
  private readonly nowMs: () => number;
  private readonly signedReadCache = new Map<
    string,
    { result: R2SignedReadResult; expiresAtMs: number }
  >();

  constructor(options: R2MediaClientOptions) {
    const trimmed = options.workerUrl?.trim().replace(/\/+$/, '') ?? '';
    if (!trimmed) {
      throw new CloudRepositoryError(
        'VALIDATION_ERROR',
        'R2 Media Worker adresi yapılandırılmamış.'
      );
    }
    this.workerUrl = trimmed;
    this.getAccessToken = options.getAccessToken;
    this.fetchFn =
      options.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  private async requireToken(): Promise<string> {
    const token = await this.getAccessToken();
    if (!token || !token.trim()) {
      throw new CloudRepositoryError(
        'AUTH_REQUIRED',
        'Medya işlemi için aktif oturum gerekiyor.'
      );
    }
    return token.trim();
  }

  async uploadBlob(
    blob: Blob,
    options?: { mimeType?: string }
  ): Promise<R2UploadResult> {
    const token = await this.requireToken();
    const mimeType =
      (options?.mimeType || blob.type || 'application/octet-stream')
        .split(';')[0]
        ?.trim()
        .toLowerCase() || 'application/octet-stream';
    const sha256 = await computeBlobSha256Hex(blob);

    let response: Response;
    try {
      response = await this.fetchFn(`${this.workerUrl}/assets/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
          'x-asset-sha256': sha256,
        },
        body: blob,
      });
    } catch (error) {
      throw mapSupabaseErrorToCloudError(
        error,
        'R2 medya sunucusuna bağlanılamadı.'
      );
    }

    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok || body.ok !== true) {
      throw mapWorkerHttpStatusToCloudError(
        response.status,
        body,
        'Medya dosyası R2 deposuna yüklenemedi.'
      );
    }

    return {
      ok: true,
      deduplicated: Boolean(body.deduplicated),
      objectKey: String(body.objectKey),
      sha256: String(body.sha256),
      mimeType: String(body.mimeType || mimeType),
      sizeBytes: Number(body.sizeBytes ?? blob.size),
    };
  }

  async signReadUrl(
    objectKey: string,
    ttlSeconds?: number
  ): Promise<R2SignedReadResult> {
    const trimmedKey = objectKey.trim();
    if (!trimmedKey) {
      throw new CloudRepositoryError(
        'VALIDATION_ERROR',
        'İmzalanacak R2 objectKey boş olamaz.'
      );
    }

    const now = this.nowMs();
    const cached = this.signedReadCache.get(trimmedKey);
    // Süre dolmadan 30 saniye öncesine kadar önbellekteki imzalı URL'yi yeniden kullan
    if (cached && cached.expiresAtMs - 30_000 > now) {
      return cached.result;
    }

    const token = await this.requireToken();
    let response: Response;
    try {
      response = await this.fetchFn(`${this.workerUrl}/assets/sign-read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectKey: trimmedKey,
          ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
        }),
      });
    } catch (error) {
      throw mapSupabaseErrorToCloudError(
        error,
        'R2 okuma bağlantısı alınamadı.'
      );
    }

    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok || body.ok !== true || typeof body.url !== 'string') {
      throw mapWorkerHttpStatusToCloudError(
        response.status,
        body,
        'R2 okuma bağlantısı oluşturulamadı.'
      );
    }

    const expiresAt =
      typeof body.expiresAt === 'string'
        ? body.expiresAt
        : new Date(now + Number(body.ttlSeconds ?? 3600) * 1000).toISOString();
    const parsedExpMs = Date.parse(expiresAt);

    const result: R2SignedReadResult = {
      objectKey: String(body.objectKey || trimmedKey),
      url: body.url,
      expiresAt,
      ttlSeconds: Number(body.ttlSeconds ?? ttlSeconds ?? 3600),
    };

    if (Number.isFinite(parsedExpMs)) {
      this.signedReadCache.set(trimmedKey, {
        result,
        expiresAtMs: parsedExpMs,
      });
    }

    return result;
  }

  async fetchObjectBlob(objectKey: string): Promise<Blob> {
    const signed = await this.signReadUrl(objectKey);
    let response: Response;
    try {
      response = await this.fetchFn(signed.url, { method: 'GET' });
    } catch (error) {
      throw mapSupabaseErrorToCloudError(
        error,
        'R2 medya dosyası indirilemedi.'
      );
    }

    if (!response.ok) {
      throw mapWorkerHttpStatusToCloudError(
        response.status,
        {},
        'R2 medya dosyası okunamadı.'
      );
    }

    return response.blob();
  }

  clearCache(): void {
    this.signedReadCache.clear();
  }
}

export function createDefaultR2MediaClient(
  envSource?: R2MediaEnvSource
): R2MediaClient | null {
  const workerUrl = getMediaWorkerUrl(envSource);
  if (!workerUrl) return null;

  return new R2MediaClient({
    workerUrl,
    getAccessToken: async () => {
      const client = getSupabaseClient();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}
