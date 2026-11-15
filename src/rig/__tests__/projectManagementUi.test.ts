// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import { readFileSync } from 'node:fs';
// @ts-expect-error Node built-in path module
import { dirname, resolve } from 'node:path';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
// @ts-expect-error Node built-in url module
import { fileURLToPath } from 'node:url';
import {
  CloudRepositoryError,
  type CloudRepositoryErrorCode,
} from '../../utils/cloudRepositoryError.ts';
import {
  evaluateProjectSwitchConfirmation,
  formatCloudRepositoryErrorMessage,
  formatPayloadSizeWarningMessage,
  getProjectActionAvailability,
  getProjectSyncStatusDisplay,
  getSyncStateAfterLocalRename,
} from '../../utils/projectManagementUiHelpers.ts';

test('1. Five sync statuses return expected Turkish labels and visual tones', () => {
  assert.equal(getProjectSyncStatusDisplay('local-only').label, 'Yalnızca bu cihazda');
  assert.equal(getProjectSyncStatusDisplay('cloud-only').label, 'Bulutta');
  assert.equal(getProjectSyncStatusDisplay('synced').label, 'Senkronize');
  assert.equal(
    getProjectSyncStatusDisplay('dirty').label,
    'Buluta kaydedilmemiş değişiklikler var'
  );
  assert.equal(getProjectSyncStatusDisplay('conflict').label, 'Sürüm çakışması var');

  assert.equal(getProjectSyncStatusDisplay('synced').tone, 'success');
  assert.equal(getProjectSyncStatusDisplay('dirty').tone, 'warning');
  assert.equal(getProjectSyncStatusDisplay('conflict').tone, 'danger');
});

test('2. Action availability matrix respects authentication, offline state, and busy state while keeping local actions available', () => {
  // Authenticated & online: local-only can open, save to cloud, rename, delete local (not cloud)
  const localOnlyOnline = getProjectActionAvailability(
    { syncState: 'local-only', source: 'local' },
    { isAuthenticated: true, cloudAvailable: true }
  );
  assert.equal(localOnlyOnline.canOpenLocal, true);
  assert.equal(localOnlyOnline.canSaveToCloud, true);
  assert.equal(localOnlyOnline.canRename, true);
  assert.equal(localOnlyOnline.canDeleteLocal, true);
  assert.equal(localOnlyOnline.canDeleteCloud, false);
  assert.equal(localOnlyOnline.canOpenFromCloud, false);

  // Unauthenticated: local-only & dirty still open/rename/delete locally; cloud actions blocked
  const dirtyLoggedOut = getProjectActionAvailability(
    { syncState: 'dirty', source: 'both' },
    { isAuthenticated: false, cloudAvailable: false }
  );
  assert.equal(dirtyLoggedOut.canOpenLocal, true);
  assert.equal(dirtyLoggedOut.canRename, true);
  assert.equal(dirtyLoggedOut.canDeleteLocal, true);
  assert.equal(dirtyLoggedOut.canSaveToCloud, false);
  assert.equal(dirtyLoggedOut.canDeleteCloud, false);
  assert.ok(dirtyLoggedOut.cloudDisabledReason?.includes('giriş'));

  // Authenticated & offline: local actions work, cloud actions disabled
  const conflictOffline = getProjectActionAvailability(
    { syncState: 'conflict', source: 'both' },
    { isAuthenticated: true, cloudAvailable: false }
  );
  assert.equal(conflictOffline.canOpenLocal, true);
  assert.equal(conflictOffline.canDeleteLocal, true);
  assert.equal(conflictOffline.canResolveConflict, false);
  assert.equal(conflictOffline.canDeleteCloud, false);
  assert.ok(conflictOffline.cloudDisabledReason?.includes('ulaşılamıyor'));

  // Authenticated & online: conflict enables conflict resolution, blocks silent saveToCloud
  const conflictOnline = getProjectActionAvailability(
    { syncState: 'conflict', source: 'both' },
    { isAuthenticated: true, cloudAvailable: true }
  );
  assert.equal(conflictOnline.canResolveConflict, true);
  assert.equal(conflictOnline.canSaveToCloud, false);

  // Busy disables all actions
  const busy = getProjectActionAvailability(
    { syncState: 'dirty', source: 'both' },
    { isAuthenticated: true, cloudAvailable: true, isBusy: true }
  );
  assert.equal(busy.canOpenLocal, false);
  assert.equal(busy.canSaveToCloud, false);
  assert.equal(busy.canDeleteLocal, false);
  assert.equal(busy.canDeleteCloud, false);
});

test('3. Local delete and cloud delete availability are strictly independent', () => {
  const cloudOnlyOnline = getProjectActionAvailability(
    { syncState: 'cloud-only', source: 'cloud' },
    { isAuthenticated: true, cloudAvailable: true }
  );
  assert.equal(cloudOnlyOnline.canDeleteLocal, false);
  assert.equal(cloudOnlyOnline.canDeleteCloud, true);
  assert.equal(cloudOnlyOnline.canOpenFromCloud, true);

  const syncedOnline = getProjectActionAvailability(
    { syncState: 'synced', source: 'both' },
    { isAuthenticated: true, cloudAvailable: true }
  );
  assert.equal(syncedOnline.canDeleteLocal, true);
  assert.equal(syncedOnline.canDeleteCloud, true);
  assert.equal(syncedOnline.canSaveToCloud, false);

  const syncedOffline = getProjectActionAvailability(
    { syncState: 'synced', source: 'both' },
    { isAuthenticated: true, cloudAvailable: false }
  );
  assert.equal(syncedOffline.canDeleteLocal, true);
  assert.equal(syncedOffline.canDeleteCloud, false);
});

test('4. CloudRepositoryError codes and unknown errors map to user-friendly Turkish messages', () => {
  const codes: CloudRepositoryErrorCode[] = [
    'AUTH_REQUIRED',
    'REVISION_CONFLICT',
    'NOT_FOUND',
    'NETWORK_ERROR',
    'PAYLOAD_TOO_LARGE',
    'PERMISSION_DENIED',
    'VALIDATION_ERROR',
    'UNKNOWN',
  ];

  for (const code of codes) {
    const msg = formatCloudRepositoryErrorMessage(
      new CloudRepositoryError(code, 'raw')
    );
    assert.ok(msg.length > 10);
    assert.notEqual(msg, 'raw');
  }

  assert.equal(
    formatCloudRepositoryErrorMessage(new Error('Özel hata mesajı')),
    'Özel hata mesajı'
  );
  assert.ok(formatCloudRepositoryErrorMessage(null).includes('Yerel verileriniz'));
  assert.ok(
    formatPayloadSizeWarningMessage(16 * 1024 * 1024).includes('16.0 MB')
  );
});

test('5. Local rename transitions synced projects to dirty without touching cloud-only or conflict semantics', () => {
  assert.equal(getSyncStateAfterLocalRename('synced'), 'dirty');
  assert.equal(getSyncStateAfterLocalRename('dirty'), 'dirty');
  assert.equal(getSyncStateAfterLocalRename('local-only'), 'local-only');
  assert.equal(getSyncStateAfterLocalRename('conflict'), 'conflict');
});

test('6. evaluateProjectSwitchConfirmation protects unsaved local changes, dirty cloud changes, and unresolved conflicts', () => {
  const unsaved = evaluateProjectSwitchConfirmation({
    currentProjectId: 'proj-1',
    currentProjectName: 'Kesirler',
    currentSyncState: 'synced',
    hasUnsavedLocalChanges: true,
    targetProjectId: 'proj-2',
    targetProjectName: 'Geometri',
  });
  assert.equal(unsaved.requiresConfirmation, true);
  assert.equal(unsaved.reason, 'unsaved-local-changes');
  assert.ok(unsaved.message?.includes('Geometri'));

  const dirtyCloud = evaluateProjectSwitchConfirmation({
    currentProjectId: 'proj-1',
    currentProjectName: 'Kesirler',
    currentSyncState: 'dirty',
    hasUnsavedLocalChanges: false,
    targetProjectId: 'proj-2',
  });
  assert.equal(dirtyCloud.requiresConfirmation, true);
  assert.equal(dirtyCloud.reason, 'unsynced-cloud-changes');

  const conflict = evaluateProjectSwitchConfirmation({
    currentProjectId: 'proj-1',
    currentProjectName: 'Kesirler',
    currentSyncState: 'conflict',
    hasUnsavedLocalChanges: false,
    targetProjectId: 'proj-2',
  });
  assert.equal(conflict.requiresConfirmation, true);
  assert.equal(conflict.reason, 'conflict');

  const sameProject = evaluateProjectSwitchConfirmation({
    currentProjectId: 'proj-1',
    currentProjectName: 'Kesirler',
    currentSyncState: 'dirty',
    hasUnsavedLocalChanges: true,
    targetProjectId: 'proj-1',
  });
  assert.equal(sameProject.requiresConfirmation, false);

  const cleanSwitch = evaluateProjectSwitchConfirmation({
    currentProjectId: 'proj-1',
    currentProjectName: 'Kesirler',
    currentSyncState: 'synced',
    hasUnsavedLocalChanges: false,
    targetProjectId: 'proj-2',
  });
  assert.equal(cleanSwitch.requiresConfirmation, false);
});

test('7. ProjectsModal and ProjectConflictDialog are decoupled from repositories/Supabase/AuthContext and expose required UI contracts', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const projectsModalSrc = readFileSync(
    resolve(repoRoot, 'src/components/ProjectsModal.tsx'),
    'utf8'
  );
  const conflictDialogSrc = readFileSync(
    resolve(repoRoot, 'src/components/ProjectConflictDialog.tsx'),
    'utf8'
  );

  // Neither modal embeds repositories, coordinator, Supabase client, or AuthContext
  for (const src of [projectsModalSrc, conflictDialogSrc]) {
    assert.equal(src.includes('LocalProjectRepository'), false);
    assert.equal(src.includes('SupabaseProjectRepository'), false);
    assert.equal(src.includes('ProjectSyncCoordinator'), false);
    assert.equal(src.includes('getSupabaseClient'), false);
    assert.equal(src.includes('useAuth'), false);
  }

  // ProjectsModal covers loading, empty, offline, error, warning, rename, and separate local/cloud delete
  assert.ok(projectsModalSrc.includes('Projeler yükleniyor'));
  assert.ok(projectsModalSrc.includes('Henüz kayıtlı projeniz yok'));
  assert.ok(projectsModalSrc.includes('Bulut bağlantısı şu anda kullanılamıyor'));
  assert.ok(projectsModalSrc.includes('Yerelden Sil'));
  assert.ok(projectsModalSrc.includes('Buluttan Sil'));
  assert.ok(projectsModalSrc.includes('Evet, Bu Cihazdan Sil'));
  assert.ok(projectsModalSrc.includes('Evet, Buluttan Sil'));
  assert.ok(projectsModalSrc.includes('getProjectActionAvailability'));
  assert.ok(projectsModalSrc.includes('getProjectSyncStatusDisplay'));

  // ProjectConflictDialog separates all 3 conflict options, uses 2-step confirmation for overwrites, and guards isSubmitting
  assert.ok(conflictDialogSrc.includes('1. Bulut sürümünü kullan'));
  assert.ok(conflictDialogSrc.includes('2. Bu cihazdaki sürümü buluta kaydet'));
  assert.ok(conflictDialogSrc.includes('3. Bu cihazdaki sürümü yeni proje olarak kaydet'));
  assert.ok(conflictDialogSrc.includes("confirmStep === 'keep-cloud'"));
  assert.ok(conflictDialogSrc.includes("confirmStep === 'keep-local'"));
  assert.ok(conflictDialogSrc.includes('disabled={isSubmitting}'));
});

test('8. App.tsx and TopHeader.tsx integrate ProjectsModal, ProjectConflictDialog, active sync state, rekeyed IDs, and switch confirmation', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const appSrc = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf8');
  const headerSrc = readFileSync(
    resolve(repoRoot, 'src/components/TopHeader.tsx'),
    'utf8'
  );

  // TopHeader exposes Projelerim button, activeSyncState badge, and conditional Buluta Kaydet
  assert.ok(headerSrc.includes('onOpenProjects'));
  assert.ok(headerSrc.includes('Projelerim'));
  assert.ok(headerSrc.includes('activeSyncState'));
  assert.ok(headerSrc.includes('onSaveActiveToCloud'));
  assert.ok(headerSrc.includes('getProjectSyncStatusDisplay'));

  // App.tsx wires coordinator & modals with proper data safety guards
  assert.ok(appSrc.includes('new ProjectSyncCoordinator'));
  assert.ok(appSrc.includes('<ProjectsModal'));
  assert.ok(appSrc.includes('<ProjectConflictDialog'));
  assert.ok(appSrc.includes('evaluateProjectSwitchConfirmation'));
  assert.ok(appSrc.includes('result.rekeyedFromProjectId'));
  assert.ok(appSrc.includes('getSyncStateAfterLocalRename'));
  assert.ok(appSrc.includes('resolveConflictKeepCloud'));
  assert.ok(appSrc.includes('resolveConflictKeepLocal'));
  assert.ok(appSrc.includes('resolveConflictSaveAsCopy'));
});
