import type { AuthModalTab } from '../components/AuthModal.tsx';

export type EntryRouteIntent = 'landing' | 'signin' | 'signup' | 'demo' | 'dashboard' | 'studio' | 'watch';

export type ResolvedAppView = 'loading' | 'landing' | 'demo' | 'dashboard' | 'studio' | 'watch';

export interface EntryRouteResolution {
  view: ResolvedAppView;
  authModalTab: AuthModalTab | null;
  isDemoMode: boolean;
  canAccessStudio: boolean;
}

function normalizeSegment(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

export function parseWatchShareId(
  pathname: string,
  search = '',
  hash = ''
): string | null {
  const params = new URLSearchParams(search);
  const queryWatch = params.get('watch')?.trim();
  if (queryWatch && /^[A-Za-z0-9_-]{24,}$/.test(queryWatch)) {
    return queryWatch;
  }

  const hashClean = normalizeSegment(hash.replace(/^#/, ''));
  if (hashClean.startsWith('watch/')) {
    const id = hashClean.slice('watch/'.length).trim();
    if (/^[A-Za-z0-9_-]{24,}$/.test(id)) return id;
  }

  const pathClean = normalizeSegment(pathname);
  if (pathClean.startsWith('watch/')) {
    const id = pathClean.slice('watch/'.length).trim();
    if (/^[A-Za-z0-9_-]{24,}$/.test(id)) return id;
  }

  return null;
}

/**
 * URL pathname (/studio/:projectId), query (?project=...) veya hash (#/studio/:projectId)
 * bilgisinden açılması hedeflenen proje kimliğini çözer.
 */
export function parseStudioProjectId(
  pathname: string,
  search = '',
  hash = ''
): string | null {
  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const pathMatch = cleanPath.match(/(?:^|\/)studio\/([a-zA-Z0-9_-]+)$/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  const cleanHash = (hash || '').replace(/^#/, '').trim();
  const hashPath = (cleanHash.split('?')[0] || '').replace(/\/+$/, '');
  const hashMatch = hashPath.match(/(?:^|\/)studio\/([a-zA-Z0-9_-]+)$/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1];
  }

  const params = new URLSearchParams(search);
  const queryProject = params.get('project')?.trim();
  if (queryProject && /^[a-zA-Z0-9_-]+$/.test(queryProject)) {
    return queryProject;
  }

  return null;
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
  if (parseWatchShareId(pathname, search, hash)) {
    return 'watch';
  }

  const params = new URLSearchParams(search);
  const queryMode = params.get('mode')?.trim().toLowerCase();
  const queryAuth = params.get('auth')?.trim().toLowerCase();

  if (queryMode === 'demo') return 'demo';
  if (queryMode === 'dashboard') return 'dashboard';
  if (queryMode === 'studio') return 'studio';
  if (queryAuth === 'signup' || queryAuth === 'register' || queryAuth === 'kayit') {
    return 'signup';
  }
  if (queryAuth === 'signin' || queryAuth === 'login' || queryAuth === 'giris') {
    return 'signin';
  }

  const hashSegment = normalizeSegment(hash.replace(/^#/, ''));
  if (hashSegment === 'demo') return 'demo';
  if (hashSegment === 'dashboard') return 'dashboard';
  if (hashSegment === 'kayit' || hashSegment === 'signup') return 'signup';
  if (hashSegment === 'giris' || hashSegment === 'signin') return 'signin';
  if (hashSegment === 'studio' || hashSegment.startsWith('studio/')) return 'studio';

  const pathSegment = normalizeSegment(pathname);
  if (pathSegment === 'demo') return 'demo';
  if (pathSegment === 'dashboard') return 'dashboard';
  if (pathSegment === 'kayit' || pathSegment === 'signup' || pathSegment === 'register') {
    return 'signup';
  }
  if (pathSegment === 'giris' || pathSegment === 'signin' || pathSegment === 'login') {
    return 'signin';
  }
  if (pathSegment === 'studio' || /^studio\/[a-z0-9_-]+$/i.test(pathSegment)) return 'studio';

  return 'landing';
}

export function buildUrlForEntryIntent(
  intent: EntryRouteIntent,
  projectId?: string
): string {
  switch (intent) {
    case 'demo':
      return '/?mode=demo';
    case 'signin':
      return '/?auth=signin';
    case 'signup':
      return '/?auth=signup';
    case 'dashboard':
      return '/?mode=dashboard';
    case 'studio':
      return projectId
        ? `/?mode=studio&project=${encodeURIComponent(projectId)}`
        : '/?mode=studio';
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
  if (input.intent === 'watch') {
    return {
      view: 'watch',
      authModalTab: null,
      isDemoMode: false,
      canAccessStudio: false,
    };
  }

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
    if (input.intent === 'studio') {
      return {
        view: 'studio',
        authModalTab: null,
        isDemoMode: false,
        canAccessStudio: true,
      };
    }
    return {
      view: 'dashboard',
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

  // Yetkisiz doğrudan /dashboard, /studio veya / erişimi karşılama ekranına düşer.
  return {
    view: 'landing',
    authModalTab: null,
    isDemoMode: false,
    canAccessStudio: false,
  };
}
