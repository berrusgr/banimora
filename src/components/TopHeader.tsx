import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Undo2,
  Redo2,
  Grid3X3,
  Play,
  Pause,
  Download,
  ZoomIn,
  ZoomOut,
  Check,
  Clock,
  Video,
  Plus,
  Save,
  FolderOpen,
  Layout,
  Maximize,
  FilePlus2,
  GraduationCap,
  MessageSquarePlus,
  ChevronDown,
  Sliders,
  MonitorPlay,
} from 'lucide-react';
import type { ProjectMode } from '../types/studio';
import type { WorkspaceMode } from '../utils/workspaceLayoutStorage';
import {
  formatCompactDuration,
  MAX_TOTAL_PROJECT_DURATION,
} from '../utils/animationEngine';

interface TopHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  totalProjectDuration: number;
  sceneCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  hasCamera: boolean;
  isCameraSelected: boolean;
  onAddOrSelectCamera: () => void;
  onAddCameraMovement: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenExport: () => void;
  onSaveProjectJson: () => void;
  onLoadProjectJson: (file: File) => Promise<boolean> | boolean;
  workspaceMode?: WorkspaceMode;
  onChangeWorkspaceMode?: (mode: WorkspaceMode) => void;
  projectMode?: ProjectMode;
  onChangeProjectMode?: (mode: ProjectMode) => void;
  onNewProject?: () => void;
  onOpenAddieInfo?: () => void;
  onOpenInteractionEditor?: () => void;
  onOpenStudentPlayer?: () => void;
  onOpenPlayerSettings?: () => void;
  assureSlot?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  projectName,
  onProjectNameChange,
  totalProjectDuration,
  sceneCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  hasCamera,
  isCameraSelected,
  onAddOrSelectCamera,
  onAddCameraMovement,
  isPlaying,
  onTogglePlay,
  onOpenExport,
  onSaveProjectJson,
  onLoadProjectJson,
  workspaceMode = 'standard',
  onChangeWorkspaceMode,
  projectMode = 'classic',
  onChangeProjectMode,
  onNewProject,
  onOpenAddieInfo,
  onOpenInteractionEditor,
  onOpenStudentPlayer,
  onOpenPlayerSettings,
  assureSlot,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [jsonStatus, setJsonStatus] = useState<'saved' | 'loaded' | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

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
    <header className="min-h-12 py-1.5 border-b border-slate-200 bg-white/95 backdrop-blur-md px-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 shadow-2xs overflow-visible">
      {/* LEFT: Logo, Editable Project Name & 10-Min Total Duration Badge */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 pr-2.5 border-r border-slate-200 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold tracking-wider text-slate-900 leading-none">
              BANIMORA
            </span>
            <span className="text-[9.5px] text-indigo-600 font-semibold tracking-tight mt-0.5 whitespace-nowrap">
              EDU STUDIO 2D
            </span>
          </div>
        </div>

        {/* Editable Project Name Input */}
        <div className="relative flex flex-wrap items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors w-28 xl:w-36"
            aria-label="Proje Adı"
          />
          <span
            className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg font-mono font-semibold whitespace-nowrap shrink-0"
            title="Toplam Süre"
          >
            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>
              {sceneCount} Sahne • {formatCompactDuration(totalProjectDuration)} /{' '}
              {formatCompactDuration(MAX_TOTAL_PROJECT_DURATION)}
            </span>
          </span>
          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Yeni Proje Oluştur"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Yeni</span>
            </button>
          )}
          {onChangeProjectMode && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsModeMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isModeMenuOpen}
                aria-label="Çalışma Modu"
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  projectMode === 'addie'
                    ? 'bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80'
                }`}
                title="Proje Çalışma Modunu Değiştir"
              >
                <span>{projectMode === 'addie' ? 'ADDIE Modu' : 'Klasik Mod'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {isModeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsModeMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Çalışma Modu
                    </div>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={projectMode === 'classic'}
                      onClick={() => {
                        setIsModeMenuOpen(false);
                        if (projectMode !== 'classic') {
                          onChangeProjectMode('classic');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        projectMode === 'classic'
                          ? 'font-bold text-indigo-700 bg-indigo-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>Klasik Video Hazırlama</span>
                      {projectMode === 'classic' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={projectMode === 'addie'}
                      onClick={() => {
                        setIsModeMenuOpen(false);
                        if (projectMode !== 'addie') {
                          onChangeProjectMode('addie');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        projectMode === 'addie'
                          ? 'font-bold text-violet-700 bg-violet-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>ADDIE ile Eğitsel İçerik</span>
                      {projectMode === 'addie' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
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

      {/* CENTER: Undo, Redo, Zoom Ratio (%100), Grid Toggle */}
      <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-1 rounded-lg border border-slate-200 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md bg-white hover:bg-slate-50 disabled:opacity-35 disabled:pointer-events-none text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
          title="Geri Al (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md bg-white hover:bg-slate-50 disabled:opacity-35 disabled:pointer-events-none text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
          title="İleri Al (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => onZoomChange(Math.max(60, zoom - 10))}
          className="p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
          title="Uzaklaştır"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onZoomChange(100)}
          className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 text-xs font-mono font-semibold min-w-[54px] text-center transition-colors cursor-pointer"
          title="Yakınlaştırmayı Sıfırla (%100)"
        >
          %{zoom}
        </button>
        <button
          onClick={() => onZoomChange(Math.min(140, zoom + 10))}
          className="p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
          title="Yakınlaştır"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Grid Toggle */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded-md transition-colors border cursor-pointer ${
            showGrid
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Izgara"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>

        {onChangeWorkspaceMode && (
          <>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <div
              className="flex items-center gap-0.5 bg-white border border-slate-200/80 rounded-md p-0.5"
              title="Çalışma Alanı Düzeni"
            >
              <button
                type="button"
                onClick={() => onChangeWorkspaceMode('standard')}
                data-testid="workspace-mode-standard"
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  workspaceMode === 'standard'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Standart Çalışma Alanı (Tüm paneller açık)"
              >
                <Layout className="w-3 h-3" />
                <span className="hidden xl:inline">Standart</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeWorkspaceMode('wide')}
                data-testid="workspace-mode-wide"
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'wide'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Geniş Sahne Modu (Yan paneller daraltılır)"
              >
                <span className="hidden xl:inline">Geniş Sahne</span>
                <span className="xl:hidden">Geniş</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeWorkspaceMode('focus')}
                data-testid="workspace-mode-focus"
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  workspaceMode === 'focus'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Sahne Odaklı Mod (Maksimum sahne alanı)"
              >
                <Maximize className="w-3 h-3" />
                <span className="hidden xl:inline">Odak</span>
              </button>
            </div>
          </>
        )}
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

        <button
          onClick={() => jsonInputRef.current?.click()}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            jsonStatus === 'loaded'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900'
          }`}
          title="Kayıtlı Projeyi Yükle (JSON)"
        >
          {jsonStatus === 'loaded' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          )}
          <span className="hidden xl:inline">
            {jsonStatus === 'loaded' ? 'Yüklendi' : 'JSON Yükle'}
          </span>
        </button>

        <button
          onClick={handleSaveClick}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            jsonStatus === 'saved'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
          }`}
          title="Projeyi Bilgisayara Kaydet (JSON)"
        >
          {jsonStatus === 'saved' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Save className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="hidden xl:inline">
            {jsonStatus === 'saved' ? 'Kaydedildi' : 'JSON Kaydet'}
          </span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
          title="Video Dışa Aktar (MP4)"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>MP4</span>
        </button>
      </div>
    </header>
  );
};
