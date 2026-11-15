import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  CloudUpload,
  FolderOpen,
  HardDrive,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CombinedProjectEntry,
  CombinedSyncStatus,
} from '../utils/projectSyncCoordinator';
import {
  getProjectActionAvailability,
  getProjectSyncStatusDisplay,
} from '../utils/projectManagementUiHelpers';

export type ProjectsModalFilter = 'all' | CombinedSyncStatus;

export interface ProjectsModalProps {
  isOpen: boolean;
  projects: CombinedProjectEntry[];
  activeProjectId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  cloudAvailable: boolean;
  busyProjectId?: string | null;
  errorMessage?: string | null;
  warningMessage?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onNewProject: () => void;
  onOpenAuth?: () => void;
  onDismissError?: () => void;
  onDismissWarning?: () => void;
  onOpenProject: (entry: CombinedProjectEntry) => void;
  onSaveToCloud: (entry: CombinedProjectEntry) => void;
  onRenameProject: (
    entry: CombinedProjectEntry,
    nextName: string
  ) => Promise<void> | void;
  onDeleteLocalProject: (entry: CombinedProjectEntry) => Promise<void> | void;
  onDeleteCloudProject: (entry: CombinedProjectEntry) => Promise<void> | void;
  onResolveConflict: (entry: CombinedProjectEntry) => void;
}

interface PendingDeleteState {
  entry: CombinedProjectEntry;
  target: 'local' | 'cloud';
}

const FILTER_OPTIONS: Array<{ value: ProjectsModalFilter; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'local-only', label: 'Bu cihazda' },
  { value: 'cloud-only', label: 'Bulutta' },
  { value: 'synced', label: 'Senkronize' },
  { value: 'dirty', label: 'Kaydedilmemiş' },
  { value: 'conflict', label: 'Çakışma' },
];

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  projects,
  activeProjectId,
  isLoading,
  isAuthenticated,
  cloudAvailable,
  busyProjectId = null,
  errorMessage = null,
  warningMessage = null,
  onClose,
  onRefresh,
  onNewProject,
  onOpenAuth,
  onDismissError,
  onDismissWarning,
  onOpenProject,
  onSaveToCloud,
  onRenameProject,
  onDeleteLocalProject,
  onDeleteCloudProject,
  onResolveConflict,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectsModalFilter>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setRenamingId(null);
      setRenameDraft('');
      setPendingDelete(null);
    }
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return projects.filter((item) => {
      if (statusFilter !== 'all' && item.syncState !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return item.projectName.toLocaleLowerCase('tr-TR').includes(q);
    });
  }, [projects, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const startRename = (entry: CombinedProjectEntry) => {
    setPendingDelete(null);
    setRenamingId(entry.projectId);
    setRenameDraft(entry.projectName);
  };

  const submitRename = async (entry: CombinedProjectEntry) => {
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === entry.projectName) {
      setRenamingId(null);
      return;
    }
    await onRenameProject(entry, trimmed);
    setRenamingId(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { entry, target } = pendingDelete;
    setPendingDelete(null);
    if (target === 'local') {
      await onDeleteLocalProject(entry);
    } else {
      await onDeleteCloudProject(entry);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="projects-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <FolderOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2
                id="projects-modal-title"
                className="text-sm font-bold text-slate-900 truncate"
              >
                Projelerim
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Bu cihazdaki ve buluttaki projelerinizi tek yerden yönetin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onNewProject}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Proje</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Listeyi Yenile"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Yenile</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Offline / Error / Warning Banners */}
        <div className="px-5 pt-3 space-y-2 shrink-0">
          {!isAuthenticated && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Yerel moddasınız. Bulut projelerinize erişmek ve buluta kaydetmek
                  için giriş yapın.
                </span>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors cursor-pointer"
                >
                  Giriş Yap
                </button>
              )}
            </div>
          )}

          {isAuthenticated && !cloudAvailable && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span>
                Bulut bağlantısı şu anda kullanılamıyor. Bu cihazdaki projelerinizi
                güvenle açıp düzenlemeye devam edebilirsiniz.
              </span>
            </div>
          )}

          {warningMessage && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{warningMessage}</span>
              </div>
              {onDismissWarning && (
                <button
                  type="button"
                  onClick={onDismissWarning}
                  className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                >
                  Kapat
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-800"
            >
              <span>{errorMessage}</span>
              {onDismissError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  className="text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
                >
                  Kapat
                </button>
              )}
            </div>
          )}

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Proje ara..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                aria-label="Proje ara"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === opt.value
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {pendingDelete && (
          <div className="mx-5 mt-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 shrink-0">
            <p className="font-semibold">
              {pendingDelete.target === 'local'
                ? `"${pendingDelete.entry.projectName}" bu cihazdan silinsin mi?`
                : `"${pendingDelete.entry.projectName}" buluttan silinsin mi?`}
            </p>
            <p className="mt-1 text-rose-700">
              {pendingDelete.target === 'local'
                ? 'Proje bu tarayıcıdaki yerel depodan kaldırılır. Bulutta kayıtlı bir kopyası varsa buluttan silinmez.'
                : 'Proje bulut hesabınızdan kaldırılır. Bu cihazdaki yerel kopyanız korunur.'}
            </p>
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDelete();
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                {pendingDelete.target === 'local'
                  ? 'Evet, Bu Cihazdan Sil'
                  : 'Evet, Buluttan Sil'}
              </button>
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {isLoading && projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span>Projeler yükleniyor...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 px-4">
              <FolderOpen className="w-7 h-7 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {projects.length === 0
                  ? 'Henüz kayıtlı projeniz yok'
                  : 'Aramanızla eşleşen proje bulunamadı'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {projects.length === 0
                  ? 'Yeni bir proje oluşturarak hemen başlayabilirsiniz.'
                  : 'Farklı bir arama terimi veya durum filtresi deneyin.'}
              </p>
            </div>
          ) : (
            filteredProjects.map((entry) => {
              const statusDisplay = getProjectSyncStatusDisplay(entry.syncState);
              const isRowBusy = busyProjectId === entry.projectId;
              const availability = getProjectActionAvailability(entry, {
                isAuthenticated,
                cloudAvailable,
                isBusy: isRowBusy || Boolean(busyProjectId),
              });
              const isActive = activeProjectId === entry.projectId;
              const isRenaming = renamingId === entry.projectId;

              return (
                <div
                  key={entry.projectId}
                  className={`rounded-xl border p-3 transition-colors ${
                    isActive
                      ? 'border-indigo-300 bg-indigo-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Left Info */}
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                void submitRename(entry);
                              } else if (e.key === 'Escape') {
                                setRenamingId(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 min-w-0 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
                            aria-label="Yeni proje adı"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void submitRename(entry);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                            title="Adı Kaydet"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                            title="İptal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-xs">
                            {entry.projectName}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                              Açık
                            </span>
                          )}
                          {entry.mode && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                entry.mode === 'addie'
                                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {entry.mode === 'addie' ? 'ADDIE' : 'Klasik'}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusDisplay.badgeClassName}`}
                            title={statusDisplay.description}
                          >
                            {statusDisplay.label}
                          </span>
                        </div>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {entry.sceneCount} sahne
                        </span>
                        <span>
                          Son güncelleme: {formatUpdatedAt(entry.updatedAt)}
                        </span>
                        {entry.cloudRevision !== null && (
                          <span className="inline-flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            Bulut v{entry.cloudRevision}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {(availability.canOpenLocal ||
                        availability.canOpenFromCloud) && (
                        <button
                          type="button"
                          onClick={() => onOpenProject(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          {isRowBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FolderOpen className="w-3 h-3" />
                          )}
                          <span>Aç</span>
                        </button>
                      )}

                      {availability.canSaveToCloud && (
                        <button
                          type="button"
                          onClick={() => onSaveToCloud(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          {isRowBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CloudUpload className="w-3 h-3" />
                          )}
                          <span>Buluta Kaydet</span>
                        </button>
                      )}

                      {availability.canResolveConflict && (
                        <button
                          type="button"
                          onClick={() => onResolveConflict(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Çakışmayı Çöz</span>
                        </button>
                      )}

                      {availability.canRename && !isRenaming && (
                        <button
                          type="button"
                          onClick={() => startRename(entry)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Yeniden Adlandır"
                          aria-label="Yeniden Adlandır"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {availability.canDeleteLocal && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({ entry, target: 'local' })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Bu Cihazdan Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden md:inline">Yerelden Sil</span>
                        </button>
                      )}

                      {availability.canDeleteCloud && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({ entry, target: 'cloud' })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Buluttan Sil (Yerel kopya korunur)"
                        >
                          <CloudOff className="w-3 h-3" />
                          <span className="hidden md:inline">Buluttan Sil</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
