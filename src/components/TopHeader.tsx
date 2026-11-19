import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Download,
  Check,
  Video,
  Plus,
  Save,
  FolderOpen,
  GraduationCap,
  MessageSquarePlus,
  ChevronDown,
  Sliders,
  MonitorPlay,
  CloudUpload,
  Loader2,
  Link2,
  FileCode2,
  Package,
  LayoutGrid,
} from 'lucide-react';
import type { ProjectMode } from '../types/studio';
import { BanimoraLogo } from './BanimoraLogo';
import type { CombinedSyncStatus } from '../utils/projectSyncCoordinator';
import { getProjectSyncStatusDisplay } from '../utils/projectManagementUiHelpers';

interface TopHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  totalProjectDuration: number;
  sceneCount: number;
  hasCamera: boolean;
  isCameraSelected: boolean;
  onAddOrSelectCamera: () => void;
  onAddCameraMovement: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenExport: () => void;
  onOpenWatchShare?: () => void;
  onSaveProjectJson: () => void;
  onLoadProjectJson: (file: File) => Promise<boolean> | boolean;
  projectMode?: ProjectMode;
  onChangeProjectMode?: (mode: ProjectMode) => void;
  onNewProject?: () => void;
  onOpenProjects?: () => void;
  onBackToDashboard?: () => void;
  activeSyncState?: CombinedSyncStatus;
  isAuthenticated?: boolean;
  isCloudSaving?: boolean;
  onSaveActiveToCloud?: () => void;
  onOpenAddieInfo?: () => void;
  onOpenInteractionEditor?: () => void;
  onOpenStudentPlayer?: () => void;
  onOpenPlayerSettings?: () => void;
  isDemoMode?: boolean;
  assureSlot?: React.ReactNode;
  authSlot?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  projectName,
  onProjectNameChange,
  hasCamera,
  isCameraSelected,
  onAddOrSelectCamera,
  onAddCameraMovement,
  isPlaying,
  onTogglePlay,
  onOpenExport,
  onOpenWatchShare,
  onSaveProjectJson,
  onLoadProjectJson,
  projectMode = 'classic',
  onBackToDashboard,
  activeSyncState = 'local-only',
  isCloudSaving = false,
  onSaveActiveToCloud,
  onOpenAddieInfo,
  onOpenInteractionEditor,
  onOpenStudentPlayer,
  onOpenPlayerSettings,
  isDemoMode = false,
  assureSlot,
  authSlot,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [jsonStatus, setJsonStatus] = useState<'saved' | 'loaded' | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExportMenuOpen]);

  const triggerStatus = (status: 'saved' | 'loaded') => {
    setJsonStatus(status);
    window.setTimeout(() => {
      setJsonStatus((prev) => (prev === status ? null : prev));
    }, 1800);
  };

  const handleSaveClick = () => {
    onSaveProjectJson();
    triggerStatus('saved');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ok = await onLoadProjectJson(file);
    if (ok) {
      triggerStatus('loaded');
    }
  };
  return (
    <header className="h-12 border-b border-slate-200 bg-white/95 backdrop-blur-md px-2.5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs overflow-visible">
      {/* LEFT: Logo, Editable Project Name & 10-Min Total Duration Badge */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 pr-2.5 border-r border-slate-200 shrink-0">
          <BanimoraLogo size={28} className="rounded-lg shadow-xs" />
          <div className="flex flex-col">
            <span className="text-xs font-extrabold tracking-wider text-slate-900 leading-none">
              BANIMORA
            </span>
            <span className="text-[9.5px] text-indigo-600 font-semibold tracking-tight mt-0.5 whitespace-nowrap">
              EDU STUDIO 2D
            </span>
          </div>
        </div>

        {onBackToDashboard && !isDemoMode && (
          <button
            type="button"
            onClick={onBackToDashboard}
            data-testid="studio-back-to-dashboard-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-[#e06d53] text-xs font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Proje Yönetim Ekranına (Dashboard) Dön"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        )}

        {/* Editable Project Name Input */}
        <div className="relative flex flex-wrap items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors w-28 xl:w-36"
            aria-label="Proje Adı"
          />
          {(() => {
            const syncDisplay = getProjectSyncStatusDisplay(activeSyncState);
            return (
              <div className="hidden xl:flex items-center gap-1 shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${syncDisplay.badgeClassName}`}
                  title={syncDisplay.label}
                >
                  {syncDisplay.shortLabel}
                </span>
              </div>
            );
          })()}
          {projectMode === 'addie' && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 shrink-0">
              <button
                type="button"
                onClick={onOpenAddieInfo}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                title="ADDIE Proje Bilgilerini Düzenle"
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>ADDIE Bilgileri</span>
              </button>
              <button
                type="button"
                onClick={onOpenInteractionEditor}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                title="Etkileşim Ekle (Soru ve Etkileşim Editörü Uzantı Noktası)"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                <span>Etkileşim Ekle</span>
              </button>
              {onOpenPlayerSettings && (
                <button
                  type="button"
                  data-testid="open-player-settings-btn"
                  onClick={onOpenPlayerSettings}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  title="Oynatıcı ve Değerlendirme Ayarları"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span>Oynatıcı Ayarları</span>
                </button>
              )}
              {onOpenStudentPlayer && (
                <button
                  type="button"
                  data-testid="open-student-player-btn"
                  onClick={onOpenStudentPlayer}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  title="Öğrenci Oynatıcısı Görünümüne Geç"
                >
                  <MonitorPlay className="w-3.5 h-3.5 shrink-0" />
                  <span>Öğrenci Oynatıcısı</span>
                </button>
              )}
            </div>
          )}
          {assureSlot}
        </div>
      </div>

      {/* RIGHT: Camera Tool (Add Camera / Add Camera Movement), Play Preview & Export MP4 */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Camera Tool Button in Top-Right Menu Bar */}
        <div className="flex items-center gap-1">
          <button
            onClick={onAddOrSelectCamera}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              isCameraSelected
                ? 'bg-orange-500 border-orange-600 text-white shadow-sm shadow-orange-500/25'
                : hasCamera
                ? 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-800'
                : 'bg-slate-100 hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-800 hover:text-orange-700'
            }`}
            title="Kamera"
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Kamera</span>
          </button>

          {hasCamera && (
            <button
              onClick={onAddCameraMovement}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 text-xs font-bold transition-colors cursor-pointer"
              title="Kamera Hareketi Ekle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Kamera Hareketi</span>
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        <button
          onClick={onTogglePlay}
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            isPlaying
              ? 'bg-violet-50 border-violet-400 text-violet-700'
              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
          }`}
          title={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current text-violet-600" />
          ) : (
            <Play className="w-4 h-4 fill-current text-indigo-600" />
          )}
        </button>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {authSlot}

        {!isDemoMode && (
          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              data-testid="export-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
              title="Kaydet ve Dışa Aktarma Seçenekleri"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>Kaydet</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isExportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportMenuOpen && (
              <div
                role="menu"
                data-testid="export-menu-dropdown"
                className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={!onSaveActiveToCloud || isCloudSaving}
                  aria-disabled={!onSaveActiveToCloud || isCloudSaving}
                  data-testid="header-save-to-cloud-btn"
                  onClick={() => {
                    if (!onSaveActiveToCloud || isCloudSaving) return;
                    setIsExportMenuOpen(false);
                    onSaveActiveToCloud();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    onSaveActiveToCloud && !isCloudSaving
                      ? 'font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer'
                      : 'font-medium text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isCloudSaving ? (
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <CloudUpload
                        className={`w-3.5 h-3.5 shrink-0 ${
                          onSaveActiveToCloud ? 'text-indigo-600' : ''
                        }`}
                      />
                    )}
                    <span>{isCloudSaving ? 'Kaydediliyor...' : 'Projeyi Kaydet'}</span>
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  role="menuitem"
                  data-testid="export-menu-mp4"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onOpenExport();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>MP4 indir</span>
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  role="menuitem"
                  disabled={!onOpenWatchShare}
                  aria-disabled={!onOpenWatchShare}
                  data-testid="export-menu-watch-link"
                  onClick={() => {
                    if (!onOpenWatchShare) return;
                    setIsExportMenuOpen(false);
                    onOpenWatchShare();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    onOpenWatchShare
                      ? 'font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer'
                      : 'font-medium text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Link2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        onOpenWatchShare ? 'text-indigo-600' : ''
                      }`}
                    />
                    <span>İzleme bağlantısı oluştur</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled
                  aria-disabled="true"
                  data-testid="export-menu-html5"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-400 cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                    <span>HTML5 indir</span>
                  </span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">
                    Yakında
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled
                  aria-disabled="true"
                  data-testid="export-menu-scorm"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-400 cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>SCORM indir</span>
                  </span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">
                    Yakında
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  JSON
                </div>

                <button
                  type="button"
                  role="menuitem"
                  data-testid="export-menu-json-save"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    handleSaveClick();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {jsonStatus === 'saved' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{jsonStatus === 'saved' ? 'İndirildi' : 'İndir'}</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  data-testid="export-menu-json-load"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    jsonInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {jsonStatus === 'loaded' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span>{jsonStatus === 'loaded' ? 'Yüklendi' : 'Yükle'}</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
