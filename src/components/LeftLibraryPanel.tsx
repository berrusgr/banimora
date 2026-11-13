import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  Atom,
  Type,
  Palette,
  Wand2,
  Volume2,
  Search,
  Plus,
  Play,
  Sparkles,
  UserPlus,
  Pencil,
  Upload,
  ImagePlus,
  Music,
  Square,
  Mic,
  Shapes,
  BarChart3,
} from 'lucide-react';
import {
  CHART_TABLE_LIBRARY_ITEMS,
  ChartTableGroup,
} from './ChartsAndTablesRenderer';
import {
  ELEMENT_CATEGORY_TABS,
  ELEMENT_LIBRARY_ITEMS,
  ElementSubCategory,
} from './ElementsSvgRenderer';
import {
  AnimationComboPreset,
  AssetCategory,
  AudioClip,
  LibraryAssetItem,
  MathAssetClass,
  MathTopicCategory,
  SceneBackground,
} from '../types/studio';
import {
  ANIMATION_COMBO_PRESETS,
  LIBRARY_ITEMS,
  SCENE_BACKGROUNDS,
  STUDIO_AUDIO_LIBRARY,
  VectorAssetRenderer,
} from '../data/libraryAssets';
import { soundEngine } from '../utils/soundEffects';

interface LeftLibraryPanelProps {
  customCharacters: LibraryAssetItem[];
  uploadedObjects: LibraryAssetItem[];
  customBackgrounds: SceneBackground[];
  customAudioClips: AudioClip[];
  onAddAsset: (item: LibraryAssetItem, customPos?: { x: number; y: number }) => void;
  onUploadObjectFile: (file: File) => void;
  onUploadBackgroundFile: (file: File) => void;
  onUploadAudioFile: (file: File, fallbackDuration?: number) => void;
  onOpenCharacterStudio: (templateItem?: LibraryAssetItem) => void;
  activeBackgroundId: string;
  onSelectBackground: (bg: SceneBackground) => void;
  selectedObjectId: string | null;
  onApplyAnimationPreset: (preset: AnimationComboPreset) => void;
  onAddAudioClip: (clip: AudioClip) => void;
}

const DOCK_TABS: {
  id: AssetCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'characters', label: 'Karakter', icon: Users },
  { id: 'objects', label: 'Nesneler', icon: Atom },
  { id: 'elements', label: 'Şekiller', icon: Shapes },
  { id: 'charts', label: 'Grafik', icon: BarChart3 },
  { id: 'uploads', label: 'Yükle', icon: Upload },
  { id: 'text', label: 'Metin', icon: Type },
  { id: 'backgrounds', label: 'Sahne', icon: Palette },
  { id: 'presets', label: 'Efektler', icon: Wand2 },
  { id: 'audio', label: 'Sesler', icon: Volume2 },
];

export const LeftLibraryPanel: React.FC<LeftLibraryPanelProps> = ({
  customCharacters,
  uploadedObjects,
  customBackgrounds,
  customAudioClips,
  onAddAsset,
  onUploadObjectFile,
  onUploadBackgroundFile,
  onUploadAudioFile,
  onOpenCharacterStudio,
  activeBackgroundId,
  onSelectBackground,
  selectedObjectId,
  onApplyAnimationPreset,
  onAddAudioClip,
}) => {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('characters');
  const [activeMathClass, setActiveMathClass] = useState<MathAssetClass>('static');
  const [activeMathTopic, setActiveMathTopic] = useState<MathTopicCategory>('all');
  const [activeElementGroup, setActiveElementGroup] = useState<ElementSubCategory>('all');
  const [activeChartGroup, setActiveChartGroup] = useState<ChartTableGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const objectFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStartMicRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Tarayıcı mikrofon erişimini desteklemiyor.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const elapsedSec = Math.max(
          0.5,
          Number(((Date.now() - recordStartTimeRef.current) / 1000).toFixed(1))
        );
        const resolvedType = recorder.mimeType || mimeType || 'audio/webm';
        const ext = resolvedType.includes('mp4')
          ? 'm4a'
          : resolvedType.includes('ogg')
          ? 'ogg'
          : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: resolvedType });
        recordedChunksRef.current = [];

        setIsRecordingMic(false);
        setRecordingSeconds(0);

        if (blob.size > 0) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const ss = String(now.getSeconds()).padStart(2, '0');
          const file = new File(
            [blob],
            `Mikrofon Kaydı ${hh}-${mm}-${ss}.${ext}`,
            { type: resolvedType }
          );
          onUploadAudioFile(file, elapsedSec);
        }
      };

      recordStartTimeRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecordingMic(true);
      recorder.start(200);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - recordStartTimeRef.current) / 1000)
        );
      }, 250);
    } catch {
      setMicError('Mikrofon izni verilmedi veya cihaz bulunamadı.');
      setIsRecordingMic(false);
    }
  };

  const handleStopMicRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: LibraryAssetItem) => {
    e.dataTransfer.setData('application/banimora-asset', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const allItems = [...customCharacters, ...uploadedObjects, ...LIBRARY_ITEMS];
  const allBackgrounds = [...customBackgrounds, ...SCENE_BACKGROUNDS];
  const allAudioClips = [...customAudioClips, ...STUDIO_AUDIO_LIBRARY];

  const filteredItems =
    activeCategory === 'charts'
      ? CHART_TABLE_LIBRARY_ITEMS.filter((item) => {
          const matchesGroup =
            activeChartGroup === 'all' || item.chartGroup === activeChartGroup;
          const matchesSearch =
            searchQuery.trim() === '' ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesGroup && matchesSearch;
        })
      : activeCategory === 'elements'
      ? ELEMENT_LIBRARY_ITEMS.filter((item) => {
          const matchesGroup =
            activeElementGroup === 'all' || item.elementGroup === activeElementGroup;
          const matchesSearch =
            searchQuery.trim() === '' ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesGroup && matchesSearch;
        })
      : allItems.filter((item) => {
          const matchesCategory =
            activeCategory === 'characters' ||
            activeCategory === 'objects' ||
            activeCategory === 'text'
              ? item.category === activeCategory
              : false;
          const itemClass: MathAssetClass = item.assetClass || 'static';
          const matchesMathClass =
            activeCategory !== 'objects' || itemClass === activeMathClass;
          const matchesMathTopic =
            activeCategory !== 'objects' ||
            activeMathTopic === 'all' ||
            item.topic === activeMathTopic;
          const matchesSearch =
            searchQuery.trim() === '' ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesCategory && matchesMathClass && matchesMathTopic && matchesSearch;
        });

  const handleObjectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadObjectFile(file);
      e.target.value = '';
    }
  };

  const handleBgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadBackgroundFile(file);
      e.target.value = '';
    }
  };

  const handleAudioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadAudioFile(file);
      e.target.value = '';
    }
  };

  const handleTogglePreviewClip = (clip: AudioClip) => {
    if (playingPreviewId === clip.id && clip.audioUrl) {
      soundEngine.stopAll();
      setPlayingPreviewId(null);
      return;
    }
    soundEngine.stopAll();
    if (clip.audioUrl) {
      setPlayingPreviewId(clip.id);
      soundEngine.playClip(clip, 0, () => {
        setPlayingPreviewId((curr) => (curr === clip.id ? null : curr));
      });
    } else {
      setPlayingPreviewId(null);
      soundEngine.playClip(clip);
    }
  };

  return (
    <aside className="w-80 border-r border-slate-200 flex shrink-0 select-none z-20 bg-white">
      {/* Hidden File Inputs for Custom Object, Background & Audio Uploads */}
      <input
        ref={objectFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={handleObjectInputChange}
        className="hidden"
      />
      <input
        ref={bgFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleBgInputChange}
        className="hidden"
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/webm,audio/*"
        onChange={handleAudioInputChange}
        className="hidden"
      />

      {/* Leftmost Vertical Icon Menu (w-16 bg-slate-50) */}
      <nav className="w-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-3 gap-1.5 shrink-0">
        {DOCK_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`w-12 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title={tab.label}
            >
              <Icon className="w-[17px] h-[17px]" />
              <span className="text-[10px] font-semibold tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Right Content Drawer (flex-1 bg-white p-4) */}
      <div className="flex-1 bg-white p-4 flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="mb-3 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {activeCategory === 'characters' && 'Karakter Kütüphanesi'}
              {activeCategory === 'objects' && 'Eğitim & Bilim Nesneleri'}
              {activeCategory === 'elements' && 'Eğitim Nesneleri ve Şekiller'}
              {activeCategory === 'charts' && 'Grafik & Tablo'}
              {activeCategory === 'uploads' && 'Dışarıdan Görsel Yükle'}
              {activeCategory === 'text' && 'Metin & Bilgi Kartları'}
              {activeCategory === 'backgrounds' && 'Sahne Arka Planları'}
              {activeCategory === 'presets' && 'Hazır Animasyon Setleri'}
              {activeCategory === 'audio' && 'Stüdyo Ses & Efektler'}
            </h2>
          </div>

          {/* CHARACTER STUDIO CTA IN CHARACTERS TAB */}
          {activeCategory === 'characters' && (
            <button
              onClick={() => onOpenCharacterStudio()}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Karakter Stüdyosu</span>
            </button>
          )}

          {/* 3 MATH ASSET CLASS SUB-BUTTONS + UPLOAD BUTTON IN OBJECTS TAB */}
          {activeCategory === 'objects' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {(
                  [
                    { id: 'static', label: 'Sabit Varlık', badge: 'Şekil' },
                    { id: 'animated', label: 'Hareketli', badge: 'Özel' },
                    { id: 'composite', label: 'Parçalı', badge: 'Alt Parça' },
                  ] as const
                ).map((cls) => {
                  const isAct = activeMathClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setActiveMathClass(cls.id)}
                      className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex flex-col items-center leading-tight ${
                        isAct
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      <span>{cls.label}</span>
                      <span
                        className={`text-[8.5px] font-medium mt-0.5 ${
                          isAct ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {cls.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Konu / Tema Filtresi */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'all', label: 'Tümü' },
                    { id: 'numbers', label: 'Sayılar & Temel' },
                    { id: 'algebra', label: 'Cebir & Denklem' },
                    { id: 'geometry', label: 'Geometri' },
                    { id: 'tools', label: 'Çizim & Ölçüm' },
                    { id: 'daily-life', label: 'Günlük Yaşam' },
                    { id: 'trigonometry', label: 'Trigonometri' },
                    { id: 'functions', label: 'Fonksiyonlar' },
                    { id: 'probability', label: 'Olasılık & İstatistik' },
                    { id: 'sequences', label: 'Üstel & Diziler' },
                  ] as const
                ).map((t) => {
                  const isAct = activeMathTopic === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveMathTopic(t.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer border ${
                        isAct
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => objectFileInputRef.current?.click()}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bilgisayardan Nesne / Görsel Yükle</span>
              </button>
            </div>
          )}

          {/* UPLOAD SCENE BACKGROUND CTA BUTTON IN BACKGROUNDS TAB */}
          {activeCategory === 'backgrounds' && (
            <button
              onClick={() => bgFileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Dışarıdan Sahne Görseli Yükle</span>
            </button>
          )}

          {/* UPLOAD EXTERNAL AUDIO CTA BUTTON IN AUDIO TAB */}
          {activeCategory === 'audio' && (
            <button
              onClick={() => audioFileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Dışarıdan Ses / Müzik Yükle (+ MP3/WAV)</span>
            </button>
          )}

          {/* ELEMENTS SUB-CATEGORIES */}
          {activeCategory === 'elements' && (
            <div className="flex flex-wrap gap-1">
              {ELEMENT_CATEGORY_TABS.map((tab) => {
                const isAct = activeElementGroup === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveElementGroup(tab.id)}
                    className={`px-2 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      isAct
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* CHARTS & TABLES SUB-CATEGORIES */}
          {activeCategory === 'charts' && (
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'charts', label: 'Grafikler' },
                  { id: 'tables', label: 'Tablolar' },
                ] as const
              ).map((tab) => {
                const isAct = activeChartGroup === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartGroup(tab.id)}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      isAct
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {(activeCategory === 'characters' ||
            activeCategory === 'objects' ||
            activeCategory === 'elements' ||
            activeCategory === 'charts' ||
            activeCategory === 'text') && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Karakter veya nesne ara..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {/* 2-Column Draggable / Clickable Vector Cards */}
          {/* ELEMENTS SUB-CATEGORIES */}
          {activeCategory === 'elements' && (
            <div className="flex flex-wrap gap-1">
              {ELEMENT_CATEGORY_TABS.map((tab) => {
                const isAct = activeElementGroup === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveElementGroup(tab.id)}
                    className={`px-2 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      isAct
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* CHARTS & TABLES SUB-CATEGORIES */}
          {activeCategory === 'charts' && (
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'charts', label: 'Grafikler' },
                  { id: 'tables', label: 'Tablolar' },
                ] as const
              ).map((tab) => {
                const isAct = activeChartGroup === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartGroup(tab.id)}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      isAct
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {(activeCategory === 'characters' ||
            activeCategory === 'objects' ||
            activeCategory === 'elements' ||
            activeCategory === 'charts' ||
            activeCategory === 'text') && (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredItems.map((item, idx) => (
                <div
                  key={item.customKey || `${item.id}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => onAddAsset(item)}
                  className="group relative bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 rounded-xl p-2 flex flex-col items-center cursor-grab active:cursor-grabbing transition-all"
                >
                  <div className="w-full h-24 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center p-1 mb-1.5 overflow-hidden relative shadow-2xs">
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <VectorAssetRenderer
                        assetId={item.id}
                        color={item.defaultColor}
                        secondaryColor={item.defaultSecondaryColor}
                        characterConfig={item.characterConfig}
                        imageUrl={item.imageUrl}
                        chartData={item.chartData}
                        chartPalette={item.chartPalette}
                        tableData={item.tableData}
                        text={item.defaultText ? item.defaultText.slice(0, 18) : 'Aa'}
                        fontSize={11}
                      />
                    </div>

                    {/* Top-right Add (+) Button - Unobstructed! */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAsset(item);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer z-10"
                      title="Sahneye Ekle (+)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Bottom-left Compact Pencil Icon ONLY (No text, does not block + button) */}
                    {item.category === 'characters' && item.characterConfig && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCharacterStudio(item);
                        }}
                        className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-md bg-white/95 hover:bg-violet-600 text-slate-700 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-300 hover:border-violet-600 shadow-xs cursor-pointer z-10"
                        title="Karakteri Düzenle"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] leading-tight font-semibold text-slate-800 text-center truncate w-full">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* UPLOADS TAB: Dedicated Upload Center for Custom Objects & Scene Backgrounds */}
          {activeCategory === 'uploads' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => objectFileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Dışarıdan Nesne Görseli Yükle
                  </span>
                  <span className="text-[10px] text-slate-500">
                    PNG, SVG, JPG veya GIF — Sahneye taşınabilir nesne olarak eklenir
                  </span>
                </button>

                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 hover:bg-violet-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
                    <ImagePlus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Dışarıdan Sahne Arka Planı Yükle
                  </span>
                  <span className="text-[10px] text-slate-500">
                    16:9 tuvalin tam arka plan görseli olarak ayarlanır
                  </span>
                </button>

                <button
                  onClick={() => audioFileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Music className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Dışarıdan Ses / Müzik Yükle
                  </span>
                  <span className="text-[10px] text-slate-500">
                    MP3, WAV, OGG, M4A — Ses stüdyosuna ve timeline'a eklenir
                  </span>
                </button>
              </div>

              {uploadedObjects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2">
                    Yüklenen Nesneler ({uploadedObjects.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedObjects.map((item) => (
                      <div
                        key={item.customKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => onAddAsset(item)}
                        className="group bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-xl p-2 flex flex-col items-center cursor-pointer"
                      >
                        <div className="w-full h-20 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 mb-1 overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 truncate w-full text-center">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scene Backgrounds */}
          {activeCategory === 'backgrounds' && (
            <div className="grid grid-cols-2 gap-2.5">
              {allBackgrounds.map((bg) => {
                const isSelected = bg.id === activeBackgroundId;
                return (
                  <button
                    key={bg.id}
                    onClick={() => onSelectBackground(bg)}
                    className={`group rounded-xl p-2 border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div
                      className="w-full aspect-video rounded-lg mb-1.5 border border-slate-200 shadow-inner bg-cover bg-center"
                      style={{ background: bg.style, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                    <p className="text-xs font-semibold text-slate-800 truncate text-center w-full">
                      {bg.name}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Ready Animation Presets */}
          {activeCategory === 'presets' && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900">
                {selectedObjectId
                  ? 'Seçili nesneye tek tıkla kombo animasyon (Giriş + Vurgu + Çıkış) uygulayın:'
                  : 'Önce tuvalden bir nesne seçin, ardından hazır animasyon paketine tıklayın.'}
              </div>

              {ANIMATION_COMBO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyAnimationPreset(preset)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Audio Library */}
          {activeCategory === 'audio' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('audio/')) {
                  onUploadAudioFile(file);
                }
              }}
              className="space-y-2.5"
            >
              {/* Drag & Drop External Audio Upload Box */}
              <div
                onClick={() => audioFileInputRef.current?.click()}
                className="p-3 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">
                    Bilgisayardan Ses Dosyası Seç / Sürükle
                  </p>
                  <p className="text-[10px] text-slate-500">
                    MP3, WAV, OGG, M4A, AAC desteklenir
                  </p>
                </div>
              </div>

              {/* Microphone Voice Recording Control */}
              <div className="space-y-1.5">
                {!isRecordingMic ? (
                  <button
                    type="button"
                    onClick={handleStartMicRecording}
                    className="w-full p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    Mikrofonla Ses Kaydet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopMicRecording}
                    className="w-full p-2.5 rounded-xl border border-rose-500 bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-between gap-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      Kaydediliyor ({String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                      {String(recordingSeconds % 60).padStart(2, '0')})
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20">
                      <Square className="w-3 h-3 fill-current" />
                      Durdur & Ekle
                    </span>
                  </button>
                )}
                {micError && (
                  <p className="text-[11px] font-medium text-rose-600 px-1">
                    {micError}
                  </p>
                )}
              </div>

              {allAudioClips.map((clip) => {
                const isCustom = Boolean(clip.audioUrl || clip.type === 'custom');
                const isPlayingThis = playingPreviewId === clip.id;
                return (
                  <div
                    key={clip.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      isCustom
                        ? 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => handleTogglePreviewClip(clip)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        isPlayingThis
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border-slate-200'
                      }`}
                      title={isPlayingThis ? 'Önizlemeyi Durdur' : 'Sesi Dinle'}
                    >
                      {isPlayingThis ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {clip.name}
                        </p>
                        {isCustom && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">
                            Özel Ses
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {isCustom
                          ? 'Dışarıdan Yüklenen Ses'
                          : clip.type === 'sfx'
                          ? 'Ses Efekti'
                          : 'Arka Plan Ambiyans'}{' '}
                        • {clip.duration.toFixed(1)} sn
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        soundEngine.playClip(clip);
                        onAddAudioClip(clip);
                      }}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      + Ekle
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
