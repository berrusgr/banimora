export type CloudRepositoryErrorCode =
  | 'AUTH_REQUIRED'
  | 'REVISION_CONFLICT'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export class CloudRepositoryError extends Error {
  readonly code: CloudRepositoryErrorCode;
  readonly details?: Record<string, unknown>;
  readonly causeError?: unknown;

  constructor(
    code: CloudRepositoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
    causeError?: unknown
  ) {
    super(message);
    this.name = 'CloudRepositoryError';
    this.code = code;
    this.details = details;
    this.causeError = causeError;
  }
}

export interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

function extractErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code.trim();
  }
  return '';
}

function extractHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/**
 * Supabase / PostgreSQL / PostgREST ve ağ hatalarını merkezi CloudRepositoryError
 * sözleşmesine dönüştürür.
 */
export function mapSupabaseErrorToCloudError(
  error: unknown,
  fallbackMessage = 'Bulut proje işlemi başarısız oldu.'
): CloudRepositoryError {
  if (error instanceof CloudRepositoryError) {
    return error;
  }

  const rawCode = extractErrorCode(error);
  const rawMessage = extractErrorMessage(error);
  const lowerMessage = rawMessage.toLowerCase();
  const status = extractHttpStatus(error);

  if (
    rawMessage.startsWith('AUTH_REQUIRED:') ||
    lowerMessage.includes('jwt') && lowerMessage.includes('expired')
  ) {
    return new CloudRepositoryError(
      'AUTH_REQUIRED',
      rawMessage || 'Bulut işlemi için oturum açmanız gerekiyor.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (rawCode === '40001' || rawMessage.startsWith('REVISION_CONFLICT:')) {
    return new CloudRepositoryError(
      'REVISION_CONFLICT',
      rawMessage || 'Buluttaki proje daha yeni bir revizyona güncellenmiş.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (rawCode === 'P0002' || rawCode === 'PGRST116' || rawMessage.startsWith('NOT_FOUND:')) {
    return new CloudRepositoryError(
      'NOT_FOUND',
      rawMessage || 'Bulut projesi bulunamadı veya erişim yetkiniz yok.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (rawCode === '22023' || rawMessage.startsWith('INVALID_REVISION:')) {
    return new CloudRepositoryError(
      'VALIDATION_ERROR',
      rawMessage || 'Geçersiz revizyon veya proje parametresi.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (rawCode === '42501' || status === 401 || status === 403) {
    const isAuthMissing = lowerMessage.includes('auth_required') || status === 401;
    return new CloudRepositoryError(
      isAuthMissing ? 'AUTH_REQUIRED' : 'PERMISSION_DENIED',
      rawMessage || 'Bu proje üzerinde işlem yapma yetkiniz yok.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (
    status === 413 ||
    rawCode === '54000' ||
    lowerMessage.includes('payload too large') ||
    lowerMessage.includes('request entity too large')
  ) {
    return new CloudRepositoryError(
      'PAYLOAD_TOO_LARGE',
      rawMessage || 'Proje boyutu bulut aktarım sınırını aşıyor.',
      { pgCode: rawCode, status },
      error
    );
  }

  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('networkerror') ||
    lowerMessage.includes('network request failed') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('timeout')
  ) {
    return new CloudRepositoryError(
      'NETWORK_ERROR',
      'Bulut sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edin; yerel veriniz korunuyor.',
      { pgCode: rawCode, status },
      error
    );
  }

  return new CloudRepositoryError(
    'UNKNOWN',
    rawMessage || fallbackMessage,
    { pgCode: rawCode, status },
    error
  );
}
