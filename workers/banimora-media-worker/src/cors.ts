const DEFAULT_ALLOWED_ORIGINS = [
  'https://banimora.com',
  'https://www.banimora.com',
  'http://localhost:5173',
];

export function parseAllowedOrigins(raw?: string): Set<string> {
  if (!raw || !raw.trim()) {
    return new Set(DEFAULT_ALLOWED_ORIGINS);
  }
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(items.length > 0 ? items : DEFAULT_ALLOWED_ORIGINS);
}

export function resolveCorsHeaders(
  request: Request,
  allowedOriginsRaw?: string
): { headers: Record<string, string>; isOriginAllowed: boolean; hasOrigin: boolean } {
  const origin = request.headers.get('Origin')?.trim() ?? '';
  if (!origin) {
    return { headers: {}, isOriginAllowed: true, hasOrigin: false };
  }

  const allowed = parseAllowedOrigins(allowedOriginsRaw);
  if (!allowed.has(origin)) {
    return { headers: { Vary: 'Origin' }, isOriginAllowed: false, hasOrigin: true };
  }

  return {
    isOriginAllowed: true,
    hasOrigin: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-asset-sha256',
      'Access-Control-Expose-Headers': 'X-Content-Type-Options',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}
