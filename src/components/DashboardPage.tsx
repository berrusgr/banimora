import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudUpload,
  FolderOpen,
  HardDrive,
  Layers,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { BanimoraLogo } from './BanimoraLogo';
import type {
  CombinedProjectEntry,
  CombinedSyncStatus,
} from '../utils/projectSyncCoordinator';
import {
  getProjectActionAvailability,
  getProjectSyncStatusDisplay,
} from '../utils/projectManagementUiHelpers';

export type DashboardProjectFilter = 'all' | CombinedSyncStatus;

export interface DashboardPageProps {
  userEmail: string | null;
  userDisplayName?: string | null;
  projects: CombinedProjectEntry[];
  activeProjectId: string | null;
  isLoading: boolean;
  cloudAvailable: boolean;
  busyProjectId?: string | null;
  errorMessage?: string | null;
  notice?: { type: 'success' | 'error'; message: string } | null;
  onDismissError?: () => void;
  onDismissNotice?: () => void;
  onRefresh: () => void;
  onNewProject: () => void;
  onOpenProject: (entry: CombinedProjectEntry) => void;
  onSaveToCloud: (entry: CombinedProjectEntry) => void;
  onRenameProject: (
    entry: CombinedProjectEntry,
    nextName: string
  ) => Promise<void> | void;
  onDeleteLocalProject: (entry: CombinedProjectEntry) => Promise<void> | void;
  onDeleteCloudProject: (entry: CombinedProjectEntry) => Promise<void> | void;
  onDeleteCompleteProject?: (entry: CombinedProjectEntry) => Promise<void> | void;
  onResolveConflict: (entry: CombinedProjectEntry) => void;
  onSignOut: () => void;
}

interface PendingDeleteState {
  entry: CombinedProjectEntry;
  target: 'local' | 'cloud' | 'both';
}

const FILTER_OPTIONS: Array<{ value: DashboardProjectFilter; label: string }> = [
  { value: 'all', label: 'Tüm Projeler' },
  { value: 'synced', label: 'Senkronize' },
  { value: 'dirty', label: 'Kaydedilmemiş' },
  { value: 'conflict', label: 'Çakışma' },
];

function matchesDashboardFilter(
  syncState: CombinedSyncStatus,
  filter: DashboardProjectFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'synced') {
    return syncState === 'synced' || syncState === 'cloud-only';
  }
  if (filter === 'dirty') {
    return syncState === 'dirty' || syncState === 'local-only';
  }
  return syncState === filter;
}

const CARD_PREVIEW_GRADIENTS = [
  'from-indigo-500/15 via-violet-500/10 to-orange-500/15',
  'from-orange-500/15 via-amber-500/10 to-rose-500/15',
  'from-emerald-500/15 via-teal-500/10 to-cyan-500/15',
  'from-violet-500/15 via-fuchsia-500/10 to-indigo-500/15',
  'from-sky-500/15 via-blue-500/10 to-indigo-500/15',
];

function getCardPreviewGradient(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash * 31 + projectId.charCodeAt(i)) | 0;
  }
  return CARD_PREVIEW_GRADIENTS[Math.abs(hash) % CARD_PREVIEW_GRADIENTS.length];
}

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

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userEmail,
  userDisplayName,
  projects,
  activeProjectId,
  isLoading,
  cloudAvailable,
  busyProjectId = null,
  errorMessage = null,
  notice = null,
  onDismissError,
  onDismissNotice,
  onRefresh,
  onNewProject,
  onOpenProject,
  onSaveToCloud,
  onRenameProject,
  onDeleteLocalProject,
  onDeleteCloudProject,
  onDeleteCompleteProject,
  onResolveConflict,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DashboardProjectFilter>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  const displayUserLabel = useMemo(() => {
    const trimmedName = userDisplayName?.trim();
    if (trimmedName) return trimmedName;
    if (userEmail) return userEmail.split('@')[0] || userEmail;
    return 'Kullanıcı';
  }, [userDisplayName, userEmail]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return projects.filter((entry) => {
      if (!matchesDashboardFilter(entry.syncState, activeFilter)) {
        return false;
      }
      if (!q) return true;
      return entry.projectName.toLocaleLowerCase('tr-TR').includes(q);
    });
  }, [projects, activeFilter, searchQuery]);

  const startRename = (entry: CombinedProjectEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(entry.projectId);
    setRenameDraft(entry.projectName);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(null);
    setRenameDraft('');
  };

  const commitRename = async (entry: CombinedProjectEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === entry.projectName) {
      cancelRename();
      return;
    }
    await onRenameProject(entry, trimmed);
    cancelRename();
  };

  const renderSyncBadge = (status: CombinedSyncStatus) => {
    const display = getProjectSyncStatusDisplay(status);

    const IconComponent =
      status === 'synced'
        ? Cloud
        : status === 'cloud-only'
          ? Cloud
          : status === 'conflict'
            ? AlertTriangle
            : status === 'dirty'
              ? CloudUpload
              : HardDrive;

    return (
      <span
        title={display.description}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${display.badgeClassName}`}
      >
        <IconComponent size={11} />
        {display.shortLabel}
      </span>
    );
  };

  return (
    <div
      className="h-screen w-full overflow-y-auto overflow-x-hidden flex flex-col bg-[#faf8f7] text-slate-900 selection:bg-orange-100 selection:text-orange-900"
      data-testid="dashboard-page"
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <BanimoraLogo size={36} className="rounded-xl shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">
                  Banimora
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-[#e06d53] border border-orange-200/70">
                  Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                2D Animasyon ve Etkileşimli İçerik Platformu
              </p>
            </div>
          </div>

          {/* Right Profile & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onNewProject}
              data-testid="dashboard-header-new-project-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#e06d53] hover:bg-[#d15d43] shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Yeni Proje Oluştur</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Pill */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80"
              data-testid="dashboard-user-profile"
            >
              <div className="w-7 h-7 rounded-lg bg-[#e06d53]/12 border border-[#e06d53]/25 flex items-center justify-center text-[#e06d53]">
                <User size={14} />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span
                  className="text-xs font-bold leading-tight truncate max-w-[160px]"
                  style={{ color: '#e06d53' }}
                  title={userEmail ?? displayUserLabel}
                >
                  {displayUserLabel}
                </span>
                {userEmail && (
                  <span className="text-[10px] text-slate-400 leading-tight truncate max-w-[160px]">
                    {userEmail}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Oturumu Kapat"
                data-testid="dashboard-signout-btn"
                className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feedback / Error / Notice Banners */}
        {notice && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{notice.message}</span>
            {onDismissNotice && (
              <button
                type="button"
                onClick={onDismissNotice}
                className="p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Toolbar: Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">Projelerim</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-700">
              {projects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Projelerde ara..."
                data-testid="dashboard-search-input"
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e06d53]/25 focus:border-[#e06d53]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Projeleri Yenile"
              data-testid="dashboard-refresh-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Yenile</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6">
            {FILTER_OPTIONS.map((opt) => {
              const isSelected = activeFilter === opt.value;
              const count = projects.filter((p) =>
                matchesDashboardFilter(p.syncState, opt.value)
              ).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActiveFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {pendingDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            onClick={() => setPendingDelete(null)}
            data-testid="dashboard-delete-modal"
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Projeyi Sil
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    <span className="font-bold text-slate-900">
                      "{pendingDelete.entry.projectName}"
                    </span>{' '}
                    projesini silmek istediğinize emin misiniz?
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5">
                    Bu proje kalıcı olarak silinecek.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = pendingDelete;
                    setPendingDelete(null);
                    if (onDeleteCompleteProject) {
                      await onDeleteCompleteProject(target.entry);
                    } else if (target.target === 'both') {
                      await onDeleteCloudProject(target.entry);
                      await onDeleteLocalProject(target.entry);
                    } else if (target.target === 'cloud') {
                      await onDeleteCloudProject(target.entry);
                    } else {
                      await onDeleteLocalProject(target.entry);
                    }
                  }}
                  data-testid="dashboard-confirm-delete-btn"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid or Empty / Loading State */}
        {isLoading && projects.length === 0 ? (
          <div
            className="bg-white rounded-2xl border border-slate-200/80 py-20 flex flex-col items-center justify-center text-slate-400 gap-3"
            data-testid="dashboard-loading-state"
          >
            <Loader2 size={32} className="animate-spin text-[#e06d53]" />
            <p className="text-sm font-medium text-slate-600">Projeleriniz yükleniyor...</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty State for Users with No Projects Yet */
          <div
            className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 sm:p-16 text-center max-w-2xl mx-auto my-4 shadow-sm"
            data-testid="dashboard-empty-state"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <BanimoraLogo size={56} className="rounded-2xl shadow-md" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Henüz Kayıtlı Bir Projeniz Yok
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              İlk animasyon projenizi oluşturarak sahnelerinizi, karakterlerinizi ve hikayenizi tasarlamaya hemen başlayın.
            </p>
            <div className="mt-7">
              <button
                type="button"
                onClick={onNewProject}
                data-testid="dashboard-empty-new-project-btn"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#e06d53] hover:bg-[#d15d43] shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus size={18} />
                Yeni Proje Oluştur
              </button>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-16 text-center px-4">
            <FolderOpen size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">
              Aramanızla eşleşen proje bulunamadı
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Farklı bir anahtar kelime deneyin veya filtreyi temizleyin.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#e06d53] bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            data-testid="dashboard-projects-grid"
          >
            {/* Quick "New Project" Card */}
            <button
              type="button"
              onClick={onNewProject}
              data-testid="dashboard-card-new-project"
              className="group min-h-[240px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#e06d53] bg-white/60 hover:bg-orange-50/30 p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 group-hover:bg-[#e06d53] text-[#e06d53] group-hover:text-white flex items-center justify-center transition-colors shadow-sm mb-3">
                <Plus size={24} />
              </div>
              <span className="text-sm font-extrabold text-slate-800 group-hover:text-[#e06d53] transition-colors">
                Yeni Proje Oluştur
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Boş bir sahneyle Studio'yu aç
              </span>
            </button>

            {/* Project Cards */}
            {filteredProjects.map((entry) => {
              const isBusy = busyProjectId === entry.projectId;
              const isRenaming = renamingId === entry.projectId;
              const isActive = activeProjectId === entry.projectId;
              const actions = getProjectActionAvailability(entry, {
                isAuthenticated: true,
                cloudAvailable,
                isBusy,
              });
              const gradient = getCardPreviewGradient(entry.projectId);

              return (
                <div
                  key={entry.projectId}
                  data-testid={`dashboard-project-card-${entry.projectId}`}
                  className={`relative rounded-2xl bg-white border flex flex-col overflow-hidden cursor-default ${
                    isActive
                      ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
                      : 'border-slate-200/90 shadow-xs'
                  }`}
                >
                  {/* Card Thumbnail / Preview Area (Non-clickable, default arrow cursor) */}
                  <div
                    className={`relative h-36 bg-gradient-to-br ${gradient} border-b border-slate-100 flex items-center justify-center overflow-hidden select-none cursor-default`}
                  >
                    {/* Subtle Stage Frame Motif */}
                    <div className="w-3/4 h-20 rounded-xl bg-white/85 backdrop-blur-sm border border-white shadow-sm flex flex-col items-center justify-center gap-1.5 px-3">
                      <BanimoraLogo size={24} className="rounded-md" />
                      <span className="text-[11px] font-bold text-slate-700 truncate max-w-full">
                        {entry.projectName}
                      </span>
                    </div>

                    {/* Top-left Sync Badge */}
                    <div className="absolute top-3 left-3">
                      {renderSyncBadge(entry.syncState)}
                    </div>

                    {/* Bottom-right Scene Count Badge */}
                    {typeof entry.sceneCount === 'number' && (
                      <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-semibold backdrop-blur-xs">
                        <Layers size={10} />
                        <span>{entry.sceneCount} sahne</span>
                      </div>
                    )}

                    {/* Loading Overlay when opening/saving */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-10">
                        <Loader2 size={22} className="animate-spin text-[#e06d53]" />
                        <span className="text-[11px] font-bold text-slate-700">
                          Yükleniyor...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void commitRename(entry);
                              if (e.key === 'Escape') cancelRename();
                            }}
                            autoFocus
                            className="flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={(e) => void commitRename(entry, e)}
                            title="Kaydet"
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => cancelRename(e)}
                            title="İptal"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-sm font-bold text-slate-900 line-clamp-1"
                            title={entry.projectName}
                          >
                            {entry.projectName}
                          </h3>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 mt-1">
                        Son düzenleme: {formatUpdatedAt(entry.updatedAt)}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onOpenProject(entry)}
                        data-testid={`dashboard-open-project-${entry.projectId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#e06d53] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <FolderOpen size={12} />
                        Projeyi Aç
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Save project if dirty or local-only */}
                        {actions.canSaveToCloud && entry.syncState !== 'synced' && (
                          <button
                            type="button"
                            onClick={() => onSaveToCloud(entry)}
                            title="Projeyi Kaydet"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <CloudUpload size={14} />
                          </button>
                        )}

                        {/* Rename */}
                        {actions.canRename && (
                          <button
                            type="button"
                            onClick={(e) => startRename(entry, e)}
                            title="Yeniden Adlandır"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>
                        )}

                        {/* Delete (Cloud or Local) */}
                        {(actions.canDeleteCloud || actions.canDeleteLocal) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete({
                                entry,
                                target:
                                  actions.canDeleteLocal && actions.canDeleteCloud
                                    ? 'both'
                                    : actions.canDeleteCloud
                                      ? 'cloud'
                                      : 'local',
                              });
                            }}
                            title="Projeyi Sil"
                            data-testid={`dashboard-delete-project-${entry.projectId}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
