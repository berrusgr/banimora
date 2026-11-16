import type { FetchLike, WorkerEnv } from './types.ts';

export interface VerifiedSupabaseUser {
  userId: string;
}

export class WorkerHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'WorkerHttpError';
    this.status = status;
    this.code = code;
  }
}

export function extractBearerToken(request: Request): string | null {
  const raw = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  const token = match?.[1]?.trim() ?? '';
  return token.length > 0 ? token : null;
}

/**
 * Supabase Auth `/auth/v1/user` üzerinden access token'ı sunucu tarafında doğrular.
 * JWT içeriğini yalnızca decode ederek güvenmez.
 */
export async function verifySupabaseAccessToken(
  request: Request,
  env: Pick<WorkerEnv, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
  fetchFn: FetchLike = fetch
): Promise<VerifiedSupabaseUser> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new WorkerHttpError(401, 'AUTH_REQUIRED', 'Yetkilendirme token bilgisi eksik.');
  }

  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new WorkerHttpError(
      500,
      'SERVER_CONFIG_ERROR',
      'Kimlik doğrulama servisi yapılandırılmamış.'
    );
  }

  let response: Response;
  try {
    response = await fetchFn(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });
  } catch {
    throw new WorkerHttpError(
      502,
      'AUTH_UPSTREAM_ERROR',
      'Kimlik doğrulama sunucusuna ulaşılamadı.'
    );
  }

  if (!response.ok) {
    throw new WorkerHttpError(
      401,
      'INVALID_TOKEN',
      'Oturum geçersiz veya süresi dolmuş.'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WorkerHttpError(401, 'INVALID_TOKEN', 'Geçersiz kullanıcı doğrulama yanıtı.');
  }

  const userId =
    payload && typeof payload === 'object' && 'id' in payload
      ? String((payload as { id?: unknown }).id ?? '').trim()
      : '';

  if (!userId) {
    throw new WorkerHttpError(401, 'INVALID_TOKEN', 'Doğrulanmış kullanıcı kimliği bulunamadı.');
  }

  return { userId };
}
