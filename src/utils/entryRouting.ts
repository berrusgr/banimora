import type { AuthModalTab } from '../components/AuthModal.tsx';

export type EntryRouteIntent = 'landing' | 'signin' | 'signup' | 'demo' | 'studio';

export type ResolvedAppView = 'loading' | 'landing' | 'demo' | 'studio';

export interface EntryRouteResolution {
  view: ResolvedAppView;
  authModalTab: AuthModalTab | null;
  isDemoMode: boolean;
  canAccessStudio: boolean;
}

function normalizeSegment(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

/**
 * URL pathname, query (?mode=..., ?auth=...) ve hash bilgisinden
 * kullanıcının hedef giriş niyetini çözer.
 */
export function parseEntryRouteIntent(
  pathname: string,
  search = '',
  hash = ''
): EntryRouteIntent {
  const params = new URLSearchParams(search);
  const queryMode = params.get('mode')?.trim().toLowerCase();
  const queryAuth = params.get('auth')?.trim().toLowerCase();

  if (queryMode === 'demo') return 'demo';
  if (queryMode === 'studio') return 'studio';
  if (queryAuth === 'signup' || queryAuth === 'register' || queryAuth === 'kayit') {
    return 'signup';
  }
  if (queryAuth === 'signin' || queryAuth === 'login' || queryAuth === 'giris') {
    return 'signin';
  }

  const hashSegment = normalizeSegment(hash.replace(/^#/, ''));
  if (hashSegment === 'demo') return 'demo';
  if (hashSegment === 'kayit' || hashSegment === 'signup') return 'signup';
  if (hashSegment === 'giris' || hashSegment === 'signin') return 'signin';
  if (hashSegment === 'studio') return 'studio';

  const pathSegment = normalizeSegment(pathname);
  if (pathSegment === 'demo') return 'demo';
  if (pathSegment === 'kayit' || pathSegment === 'signup' || pathSegment === 'register') {
    return 'signup';
  }
  if (pathSegment === 'giris' || pathSegment === 'signin' || pathSegment === 'login') {
    return 'signin';
  }
  if (pathSegment === 'studio') return 'studio';

  return 'landing';
}

export function buildUrlForEntryIntent(intent: EntryRouteIntent): string {
  switch (intent) {
    case 'demo':
      return '/?mode=demo';
    case 'signin':
      return '/?auth=signin';
    case 'signup':
      return '/?auth=signup';
    case 'studio':
      return '/?mode=studio';
    case 'landing':
    default:
      return '/';
  }
}

/**
 * Oturum durumu ve rota niyetine göre uygulamanın göstereceği ekranı
 * ve kimlik doğrulama penceresi durumunu belirler.
 */
export function resolveAppEntryState(input: {
  intent: EntryRouteIntent;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isRecoveryMode?: boolean;
}): EntryRouteResolution {
  if (input.isRecoveryMode) {
    return {
      view: input.isAuthenticated ? 'studio' : 'landing',
      authModalTab: 'recovery',
      isDemoMode: false,
      canAccessStudio: input.isAuthenticated,
    };
  }

  if (input.intent === 'demo') {
    return {
      view: 'demo',
      authModalTab: null,
      isDemoMode: true,
      canAccessStudio: false,
    };
  }

  if (input.isAuthLoading) {
    return {
      view: 'loading',
      authModalTab: null,
      isDemoMode: false,
      canAccessStudio: false,
    };
  }

  if (input.isAuthenticated) {
    return {
      view: 'studio',
      authModalTab: null,
      isDemoMode: false,
      canAccessStudio: true,
    };
  }

  if (input.intent === 'signin') {
    return {
      view: 'landing',
      authModalTab: 'signin',
      isDemoMode: false,
      canAccessStudio: false,
    };
  }

  if (input.intent === 'signup') {
    return {
      view: 'landing',
      authModalTab: 'signup',
      isDemoMode: false,
      canAccessStudio: false,
    };
  }

  // Yetkisiz doğrudan /studio veya / erişimi karşılama ekranına düşer.
  return {
    view: 'landing',
    authModalTab: null,
    isDemoMode: false,
    canAccessStudio: false,
  };
}
