// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import fs from 'node:fs';
// @ts-expect-error Node built-in path module
import path from 'node:path';
// @ts-expect-error Node built-in url module
import { fileURLToPath } from 'node:url';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import {
  buildUrlForEntryIntent,
  parseEntryRouteIntent,
  resolveAppEntryState,
} from '../../utils/entryRouting.ts';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

test('1 & 5 & 7. Root / and unauthorized /studio land on LandingPage when unauthenticated, and route directly to Studio when authenticated', () => {
  const rootIntent = parseEntryRouteIntent('/', '', '');
  assert.equal(rootIntent, 'landing');

  const unauthRoot = resolveAppEntryState({
    intent: rootIntent,
    isAuthenticated: false,
    isAuthLoading: false,
  });
  assert.equal(unauthRoot.view, 'landing');
  assert.equal(unauthRoot.authModalTab, null);
  assert.equal(unauthRoot.isDemoMode, false);
  assert.equal(unauthRoot.canAccessStudio, false);

  const directStudioIntent = parseEntryRouteIntent('/studio', '', '');
  assert.equal(directStudioIntent, 'studio');
  const unauthDirectStudio = resolveAppEntryState({
    intent: directStudioIntent,
    isAuthenticated: false,
    isAuthLoading: false,
  });
  assert.equal(unauthDirectStudio.view, 'landing');
  assert.equal(unauthDirectStudio.canAccessStudio, false);

  const authRoot = resolveAppEntryState({
    intent: rootIntent,
    isAuthenticated: true,
    isAuthLoading: false,
  });
  assert.equal(authRoot.view, 'studio');
  assert.equal(authRoot.canAccessStudio, true);
  assert.equal(authRoot.isDemoMode, false);
});

test('2 & 3. Kayıt Ol and Giriş Yap routes open AuthModal on signup/signin tabs and redirect authenticated users to Studio', () => {
  assert.equal(parseEntryRouteIntent('/', '?auth=signup', ''), 'signup');
  assert.equal(parseEntryRouteIntent('/kayit', '', ''), 'signup');
  assert.equal(parseEntryRouteIntent('/', '?auth=signin', ''), 'signin');
  assert.equal(parseEntryRouteIntent('/giris', '', ''), 'signin');

  const unauthSignup = resolveAppEntryState({
    intent: 'signup',
    isAuthenticated: false,
    isAuthLoading: false,
  });
  assert.equal(unauthSignup.view, 'landing');
  assert.equal(unauthSignup.authModalTab, 'signup');

  const unauthSignin = resolveAppEntryState({
    intent: 'signin',
    isAuthenticated: false,
    isAuthLoading: false,
  });
  assert.equal(unauthSignin.view, 'landing');
  assert.equal(unauthSignin.authModalTab, 'signin');

  const authAlreadySignedIn = resolveAppEntryState({
    intent: 'signin',
    isAuthenticated: true,
    isAuthLoading: false,
  });
  assert.equal(authAlreadySignedIn.view, 'studio');
  assert.equal(authAlreadySignedIn.authModalTab, null);
});

test('6. Demo Görüntüle route works without authentication and survives refresh URLs', () => {
  assert.equal(parseEntryRouteIntent('/', '?mode=demo', ''), 'demo');
  assert.equal(parseEntryRouteIntent('/demo', '', ''), 'demo');
  assert.equal(parseEntryRouteIntent('/', '', '#/demo'), 'demo');
  assert.equal(buildUrlForEntryIntent('demo'), '/?mode=demo');

  const demoState = resolveAppEntryState({
    intent: 'demo',
    isAuthenticated: false,
    isAuthLoading: false,
  });
  assert.equal(demoState.view, 'demo');
  assert.equal(demoState.isDemoMode, true);
  assert.equal(demoState.canAccessStudio, false);
  assert.equal(demoState.authModalTab, null);
});

test('Loading state prevents premature Landing flash while session is restoring, and recovery mode stays accessible', () => {
  const loadingState = resolveAppEntryState({
    intent: 'landing',
    isAuthenticated: false,
    isAuthLoading: true,
  });
  assert.equal(loadingState.view, 'loading');

  const recoveryState = resolveAppEntryState({
    intent: 'landing',
    isAuthenticated: false,
    isAuthLoading: false,
    isRecoveryMode: true,
  });
  assert.equal(recoveryState.view, 'landing');
  assert.equal(recoveryState.authModalTab, 'recovery');
});

test('4, 8, 9 & 10. LandingPage, Demo isolation in App.tsx, and Cloudflare Pages _redirects contracts are intact', () => {
  const landingSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/LandingPage.tsx'),
    'utf8'
  );
  assert.ok(landingSource.includes('Kayıt Ol'));
  assert.ok(landingSource.includes('Giriş Yap'));
  assert.ok(landingSource.includes('Demo Görüntüle'));

  const appSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/App.tsx'),
    'utf8'
  );
  // Demo mode blocks autosave, IndexedDB migration, cloud save, projects modal, export & authSlot
  assert.ok(appSource.includes('if (isDemoMode || !entryState.canAccessStudio) return;'));
  assert.ok(appSource.includes('createDemoProjectSnapshot'));
  assert.ok(appSource.includes('setIsModeSelectorOpen(true)'));
  assert.ok(appSource.includes('onOpenProjects={isDemoMode ? undefined : handleOpenProjectsModal}'));
  assert.ok(appSource.includes('onSaveActiveToCloud={isDemoMode ? undefined : handleSaveActiveToCloud}'));
  assert.ok(appSource.includes('isDemoMode ? null : isAuthLoading'));

  const redirectsFile = fs.readFileSync(
    path.join(ROOT_DIR, 'public/_redirects'),
    'utf8'
  );
  assert.ok(redirectsFile.includes('/* /index.html 200'));
});

test('Faz 2: Edimo mode option is disabled/passive while Classic remains active, and TopHeader has single compact Export menu', () => {
  const modeModalSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/AddieProjectModals.tsx'),
    'utf8'
  );
  assert.ok(modeModalSource.includes("onClick={() => onSelectMode('classic')}"));
  assert.ok(modeModalSource.includes('data-testid="select-mode-addie"'));
  assert.ok(modeModalSource.includes('disabled'));
  assert.ok(modeModalSource.includes('aria-disabled="true"'));
  assert.ok(modeModalSource.includes('Yakında'));
  assert.ok(modeModalSource.includes('Şimdilik kullanılamıyor'));
  assert.ok(!modeModalSource.includes("onSelectMode('addie')"));

  const topHeaderSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/TopHeader.tsx'),
    'utf8'
  );
  assert.ok(topHeaderSource.includes('data-testid="export-menu-trigger"'));
  assert.ok(topHeaderSource.includes('Dışa Aktar'));
  assert.ok(topHeaderSource.includes('MP4 indir'));
  assert.ok(topHeaderSource.includes('onOpenExport()'));
  assert.ok(topHeaderSource.includes('İzleme bağlantısı oluştur'));
  assert.ok(topHeaderSource.includes('HTML5 indir'));
  assert.ok(topHeaderSource.includes('SCORM indir'));
  assert.ok(topHeaderSource.includes('{authSlot}'));
  assert.ok(topHeaderSource.includes('onClick={onTogglePlay}'));

  const appSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/App.tsx'),
    'utf8'
  );
  assert.ok(appSource.includes('if (isDemoMode) {'));
  assert.ok(appSource.includes('setIsExportOpen(true);'));
});
