import { CloudRepositoryError } from './cloudRepositoryError.ts';
import type {
  CombinedProjectEntry,
  CombinedSyncStatus,
} from './projectSyncCoordinator.ts';
import type { ProjectSyncState } from '../types/publishing.ts';

export type ProjectSyncBadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export interface ProjectSyncStatusDisplay {
  status: CombinedSyncStatus;
  label: string;
  shortLabel: string;
  description: string;
  tone: ProjectSyncBadgeTone;
  badgeClassName: string;
}

const SYNC_STATUS_DISPLAY_MAP: Record<
  CombinedSyncStatus,
  ProjectSyncStatusDisplay
> = {
  'local-only': {
    status: 'local-only',
    label: 'Yalnızca bu cihazda',
    shortLabel: 'Bu cihazda',
    description:
      'Bu proje yalnızca bu tarayıcıdaki yerel depoda saklanıyor; henüz buluta kaydedilmedi.',
    tone: 'neutral',
    badgeClassName:
      'bg-slate-100 text-slate-700 border-slate-200',
  },
  'cloud-only': {
    status: 'cloud-only',
    label: 'Bulutta',
    shortLabel: 'Bulutta',
    description:
      'Bu proje bulut hesabınızda kayıtlı; açtığınızda bu cihaza indirilir.',
    tone: 'info',
    badgeClassName:
      'bg-sky-50 text-sky-700 border-sky-200',
  },
  synced: {
    status: 'synced',
    label: 'Senkronize',
    shortLabel: 'Senkronize',
    description:
      'Bu cihazdaki sürüm ile buluttaki sürüm birbiriyle güncel ve uyumlu.',
    tone: 'success',
    badgeClassName:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  dirty: {
    status: 'dirty',
    label: 'Buluta kaydedilmemiş değişiklikler var',
    shortLabel: 'Kaydedilmemiş',
    description:
      'Bu cihazda yaptığınız son değişiklikler henüz buluta gönderilmedi.',
    tone: 'warning',
    badgeClassName:
      'bg-amber-50 text-amber-800 border-amber-200',
  },
  conflict: {
    status: 'conflict',
    label: 'Sürüm çakışması var',
    shortLabel: 'Çakışma',
    description:
      'Hem bu cihazda hem bulutta farklı değişiklikler var. Devam etmeden önce hangi sürümün korunacağını seçin.',
    tone: 'danger',
    badgeClassName:
      'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export function getProjectSyncStatusDisplay(
  syncState: CombinedSyncStatus
): ProjectSyncStatusDisplay {
  return SYNC_STATUS_DISPLAY_MAP[syncState];
}

export interface ProjectActionContext {
  isAuthenticated: boolean;
  cloudAvailable: boolean;
  isBusy?: boolean;
}

export interface ProjectActionAvailability {
  canOpenLocal: boolean;
  canOpenFromCloud: boolean;
  canSaveToCloud: boolean;
  canRename: boolean;
  canDeleteLocal: boolean;
  canDeleteCloud: boolean;
  canResolveConflict: boolean;
  cloudDisabledReason?: string;
}

/**
 * Oturum, ağ/bulut erişilebilirliği ve senkronizasyon durumuna göre
 * tek bir proje satırında hangi yerel ve bulut işlemlerinin kullanılabilir
 * olduğunu belirler. Yerel ve bulut silme birbirinden bağımsızdır.
 */
export function getProjectActionAvailability(
  entry: Pick<CombinedProjectEntry, 'syncState' | 'source'>,
  context: ProjectActionContext
): ProjectActionAvailability {
  const isBusy = Boolean(context.isBusy);
  const hasLocalCopy = entry.source === 'local' || entry.source === 'both';
  const hasCloudCopy = entry.source === 'cloud' || entry.source === 'both';
  const canUseCloud = !isBusy && context.isAuthenticated && context.cloudAvailable;

  let cloudDisabledReason: string | undefined;
  if (!context.isAuthenticated) {
    cloudDisabledReason = 'Bulut işlemleri için Banimora hesabınıza giriş yapın.';
  } else if (!context.cloudAvailable) {
    cloudDisabledReason =
      'Bulut sunucusuna şu anda ulaşılamıyor. Yerel işlemlerinizi kullanmaya devam edebilirsiniz.';
  }

  return {
    canOpenLocal: !isBusy && hasLocalCopy && entry.syncState !== 'cloud-only',
    canOpenFromCloud:
      canUseCloud && entry.syncState === 'cloud-only',
    canSaveToCloud:
      canUseCloud &&
      hasLocalCopy &&
      (entry.syncState === 'local-only' || entry.syncState === 'dirty'),
    canRename:
      !isBusy &&
      (hasLocalCopy || (entry.syncState === 'cloud-only' && canUseCloud)),
    canDeleteLocal: !isBusy && hasLocalCopy,
    canDeleteCloud: canUseCloud && hasCloudCopy,
    canResolveConflict: canUseCloud && entry.syncState === 'conflict',
    ...(cloudDisabledReason ? { cloudDisabledReason } : {}),
  };
}

/**
 * Senkronize bir proje yerel olarak yeniden adlandırıldığında bulut adının
 * otomatik değişmemesi için durumun `dirty` olarak güncellenmesini sağlar.
 */
export function getSyncStateAfterLocalRename(
  currentState: ProjectSyncState
): ProjectSyncState {
  if (currentState === 'synced') return 'dirty';
  if (currentState === 'conflict') return 'conflict';
  if (currentState === 'dirty') return 'dirty';
  return 'local-only';
}

export function formatCloudRepositoryErrorMessage(error: unknown): string {
  if (error instanceof CloudRepositoryError) {
    switch (error.code) {
      case 'AUTH_REQUIRED':
        return 'Bulut işlemi için Banimora hesabınıza giriş yapmanız gerekiyor.';
      case 'REVISION_CONFLICT':
        return 'Bu proje başka bir oturumda güncellenmiş. Çakışma çözümünü kullanarak hangi sürümün korunacağını seçin.';
      case 'NOT_FOUND':
        return 'Proje bulutta bulunamadı veya daha önce silinmiş.';
      case 'NETWORK_ERROR':
        return 'Bulut sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edin; bu cihazdaki projeleriniz güvende.';
      case 'PAYLOAD_TOO_LARGE':
        return 'Proje boyutu 24 MB bulut aktarım sınırını aşıyor. Medya boyutlarını küçültün veya JSON olarak dışa aktarın.';
      case 'PERMISSION_DENIED':
        return 'Bu proje üzerinde işlem yapma yetkiniz bulunmuyor.';
      case 'VALIDATION_ERROR':
        return 'Proje adı veya sürüm bilgisi geçersiz olduğu için işlem tamamlanamadı.';
      case 'UNKNOWN':
      default: {
        const detail = error.message?.trim();
        return detail
          ? `Bulut işlemi beklenmeyen bir hata nedeniyle tamamlanamadı. Yerel verileriniz korunuyor. (${detail})`
          : 'Bulut işlemi beklenmeyen bir hata nedeniyle tamamlanamadı. Yerel verileriniz korunuyor.';
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'İşlem sırasında beklenmeyen bir hata oluştu. Yerel verileriniz korunuyor.';
}

export function formatPayloadSizeWarningMessage(byteLength: number): string {
  const mb = (byteLength / (1024 * 1024)).toFixed(1);
  return `Proje boyutu (${mb} MB) 24 MB bulut sınırına yaklaşıyor. Büyük medya dosyalarını küçültmeniz önerilir.`;
}

export interface ActiveProjectSwitchCheckInput {
  currentProjectId: string | null;
  currentProjectName: string;
  currentSyncState?: CombinedSyncStatus;
  hasUnsavedLocalChanges: boolean;
  targetProjectId: string;
  targetProjectName?: string;
}

export interface ProjectSwitchConfirmationResult {
  requiresConfirmation: boolean;
  reason?: 'unsaved-local-changes' | 'unsynced-cloud-changes' | 'conflict';
  title?: string;
  message?: string;
}

/**
 * Aktif projede kaydedilmemiş yerel/bulut değişiklikleri varken başka bir projeye
 * geçiş yapılmadan önce kullanıcı onayı gerekip gerekmediğini değerlendirir.
 */
export function evaluateProjectSwitchConfirmation(
  input: ActiveProjectSwitchCheckInput
): ProjectSwitchConfirmationResult {
  if (
    input.currentProjectId &&
    input.currentProjectId === input.targetProjectId
  ) {
    return { requiresConfirmation: false };
  }

  const targetLabel = input.targetProjectName?.trim()
    ? `"${input.targetProjectName.trim()}"`
    : 'seçilen projeye';

  if (input.hasUnsavedLocalChanges) {
    return {
      requiresConfirmation: true,
      reason: 'unsaved-local-changes',
      title: 'Kaydedilmemiş değişiklikler var',
      message: `"${input.currentProjectName}" projesinde henüz kaydedilmemiş değişiklikler bulunuyor. ${targetLabel} geçmek istediğinizden emin misiniz?`,
    };
  }

  if (input.currentSyncState === 'conflict') {
    return {
      requiresConfirmation: true,
      reason: 'conflict',
      title: 'Sürüm çakışması çözülmedi',
      message: `"${input.currentProjectName}" projesinde çözülmemiş bir sürüm çakışması var. Yine de ${targetLabel} geçmek istiyor musunuz?`,
    };
  }

  if (input.currentSyncState === 'dirty') {
    return {
      requiresConfirmation: true,
      reason: 'unsynced-cloud-changes',
      title: 'Buluta kaydedilmemiş değişiklikler var',
      message: `"${input.currentProjectName}" projesindeki son değişiklikler bu cihazda kayıtlı ancak henüz buluta gönderilmedi. ${targetLabel} geçmek istiyor musunuz?`,
    };
  }

  return { requiresConfirmation: false };
}
