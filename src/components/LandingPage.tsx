import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  FolderOpen,
  Layers,
  LogIn,
  Pause,
  Play,
  PlusCircle,
  Shapes,
  Sparkles,
  Type,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  ArticulatedCharacterRig,
  DEFAULT_CHARACTER_CONFIGS,
} from './ArticulatedCharacterRig';
import type {
  CharacterConfig,
  CharacterExpressionType,
  CharacterPoseType,
} from '../types/studio';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onOpenDemo: () => void;
}

interface StudioPoseOption {
  id: CharacterPoseType;
  label: string;
  expression: CharacterExpressionType;
  speech: string;
}

const ELVAN_POSE_SEQUENCE: StudioPoseOption[] = [
  {
    id: 'wave',
    label: 'El Salla',
    expression: 'happy',
    speech: 'Merhaba! Bugün doğrusal grafikleri birlikte keşfedelim.',
  },
  {
    id: 'explain',
    label: 'Konu Anlat',
    expression: 'excited',
    speech: 'y = 2x + 4 denkleminde eğim her adımda 2 birim artar!',
  },
  {
    id: 'presentation',
    label: 'Tahtayı Göster',
    expression: 'happy',
    speech: 'Tablodaki değerlerin grafikte nasıl yükseldiğine dikkat edin.',
  },
  {
    id: 'cheer',
    label: 'Kutla',
    expression: 'excited',
    speech: 'Harika! Şimdi sıra sizin interaktif sorunuzda.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignUp,
  onSignIn,
  onOpenDemo,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [animTime, setAnimTime] = useState(0);
  const [manualPoseIndex, setManualPoseIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;
      setAnimTime((prev) => (prev + dt) % 12);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const activePoseIndex =
    manualPoseIndex !== null
      ? manualPoseIndex
      : Math.floor(animTime / 3) % ELVAN_POSE_SEQUENCE.length;

  const activePoseItem = ELVAN_POSE_SEQUENCE[activePoseIndex];

  const elvanConfig: CharacterConfig = useMemo(
    () => ({
      ...DEFAULT_CHARACTER_CONFIGS['char-pro-elvan'],
      pose: activePoseItem.id,
      expression: activePoseItem.expression,
      headDirection:
        activePoseItem.id === 'presentation' ? 'right' : 'center',
      lipSyncEnabled: isPlaying,
      ttsScript: activePoseItem.speech,
      actionSpeed: 1.05,
      actionIntensity: 1.0,
    }),
    [activePoseItem, isPlaying]
  );

  const playheadPercent = ((animTime % 12) / 12) * 100;
  const formattedTime = `00:0${Math.floor(animTime % 10)}.${Math.floor(
    ((animTime % 1) * 10) % 10
  )}`;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#faf8f7] text-slate-900 selection:bg-[#e06d53]/20 selection:text-[#9c3b26]">
      {/* Yumuşak Arka Plan Animasyonları */}
      <style>{`
        @keyframes banimoraFloatSlow {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
          50% { transform: translate3d(22px, -16px, 0) scale(1.05); }
        }
        @keyframes banimoraFloatReverse {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
          50% { transform: translate3d(-20px, 14px, 0) scale(1.04); }
        }
        @keyframes banimoraPulseSoft {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .banimora-drift-1 { animation: banimoraFloatSlow 15s ease-in-out infinite; }
        .banimora-drift-2 { animation: banimoraFloatReverse 18s ease-in-out infinite; }
        .banimora-drift-3 { animation: banimoraFloatSlow 21s ease-in-out infinite reverse; }
        .banimora-pulse-soft { animation: banimoraPulseSoft 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .banimora-drift-1, .banimora-drift-2, .banimora-drift-3, .banimora-pulse-soft {
            animation: none !important;
          }
        }
      `}</style>

      {/* Tema Arka Plan Katmanı: Elvan Hanım Süveter Rengi (#e06d53) + Mor/İndigo Tonları */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(124 58 237 / 0.16) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="banimora-drift-1 absolute -top-28 -left-20 h-[380px] w-[380px] rounded-full bg-[#e06d53]/20 blur-3xl sm:h-[460px] sm:w-[460px]" />
        <div className="banimora-drift-2 absolute top-1/5 -right-24 h-[360px] w-[360px] rounded-full bg-violet-400/25 blur-3xl sm:h-[440px] sm:w-[440px]" />
        <div className="banimora-drift-3 absolute -bottom-28 left-1/4 h-[340px] w-[380px] rounded-full bg-indigo-400/20 blur-3xl" />
      </div>

      {/* Üst Gezinme Çubuğu (Mobil Uyumlu) */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shadow-[#e06d53]/25 sm:h-10 sm:w-10"
            style={{
              background:
                'linear-gradient(135deg, #4f46e5 0%, #7c3aed 52%, #e06d53 100%)',
            }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
              Banimora
            </span>
            <span className="hidden text-[10px] font-semibold tracking-wider text-violet-700/80 uppercase sm:block">
              Eğitim Animasyon Stüdyosu
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenDemo}
            className="hidden items-center gap-1.5 rounded-xl border border-violet-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-violet-700 backdrop-blur-xs transition hover:border-violet-300 hover:bg-violet-50/70 sm:inline-flex cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-violet-600 text-violet-600" />
            Stüdyoyu Dene
          </button>

          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-xs transition hover:border-[#e06d53]/50 hover:text-slate-900 sm:px-4 sm:py-2.5 cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5 text-[#e06d53]" />
            <span>Giriş Yap</span>
          </button>

          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-[#e06d53] px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-95 sm:px-4 sm:py-2.5 cursor-pointer"
          >
            <span>Ücretsiz Başla</span>
          </button>
        </div>
      </header>

      {/* Ana Hero Alanı */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* SOL SÜTUN: Değer Önerisi, Tema Vurguları ve Eylem Çağrıları */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e06d53]/30 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs backdrop-blur-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e06d53]/15 text-[#c8563d]">
                <Sparkles className="h-3 w-3" />
              </span>
              <span>Öğretmenler İçin Yeni Nesil 2D Animasyon Stüdyosu</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
              Derslerinizi{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-[#e06d53] bg-clip-text text-transparent">
                Elvan Hanım ve akıllı sahnelerle
              </span>{' '}
              canlandırın.
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              Teknik bilgi gerektirmeden eklemli öğretmen karakterlerini
              konuşturun, matematik ve fen araçlarını sahneye sürükleyin,
              etkileşimli sorular ekleyip saniyeler içinde paylaşın.
            </p>

            {/* Öne Çıkan Özellik Rozetleri */}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/80 bg-violet-50/80 px-2.5 py-1 text-xs font-semibold text-violet-800">
                <Wand2 className="h-3.5 w-3.5 text-violet-600" />
                Otomatik Dudak Senkronu
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e06d53]/30 bg-[#e06d53]/10 px-2.5 py-1 text-xs font-semibold text-[#9c3b26]">
                <Users className="h-3.5 w-3.5 text-[#e06d53]" />
                Akıllı Karakter Hareketleri
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                <Shapes className="h-3.5 w-3.5 text-indigo-600" />
                Etkileşimli Ders Soruları
              </span>
            </div>

            {/* Öncelikli 3 Eylem Butonu (Mobil Tam Genişlik, Masaüstü Yan Yana) */}
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={onSignUp}
                data-testid="landing-signup-btn"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-[#e06d53] px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-600/20 transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 sm:w-auto cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 shrink-0" />
                <span>Kayıt Ol</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onSignIn}
                data-testid="landing-signin-btn"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-2xs transition hover:border-[#e06d53]/60 hover:bg-[#faf6f5] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 sm:w-auto cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-[#e06d53]" />
                <span>Giriş Yap</span>
              </button>

              <button
                type="button"
                onClick={onOpenDemo}
                data-testid="landing-demo-btn"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50/90 px-5 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 sm:w-auto cursor-pointer"
              >
                <Play className="h-4 w-4 shrink-0 fill-[#e06d53] text-[#e06d53]" />
                <span>Demo Görüntüle</span>
              </button>
            </div>
          </div>

          {/* SAĞ SÜTUN: Canlı Banimora Uygulama Tasarım Ekranı & Hareket Eden Elvan Hanım */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-violet-200/90 bg-white shadow-2xl shadow-violet-950/10 ring-1 ring-[#e06d53]/15">
              {/* 1. Uygulama Üst Çubuğu (TopHeader Simülasyonu) */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-3 py-2 text-white sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e06d53]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="ml-1.5 truncate text-xs font-bold tracking-tight text-slate-100 sm:text-sm">
                    Banimora Stüdyo — Doğrusal Fonksiyonlar Dersi
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="hidden rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-200 border border-violet-400/30 sm:inline-block">
                    Sahne 1 / 3
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#e06d53] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#d15b41] cursor-pointer"
                    title={isPlaying ? 'Önizlemeyi Duraklat' : 'Önizlemeyi Oynat'}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3 w-3 fill-white" />
                        <span>Duraklat</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-white" />
                        <span>Oynat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Orta Tasarım Çalışma Alanı (Sol Kütüphane + Orta Sahne + Sağ Denetçi) */}
              <div className="grid grid-cols-1 md:grid-cols-12 bg-slate-100">
                {/* Sol Kütüphane İkon Şeridi (Masaüstünde görünür) */}
                <div className="hidden md:col-span-2 md:flex flex-col items-center justify-between border-r border-slate-200 bg-white py-3 px-1.5">
                  <div className="flex flex-col items-center gap-2 w-full">
                    {[
                      { icon: Users, label: 'Karakter', active: true },
                      { icon: Shapes, label: 'Nesneler', active: false },
                      { icon: Layers, label: 'Grafikler', active: false },
                      { icon: Type, label: 'Metin', active: false },
                      { icon: Volume2, label: 'Sesler', active: false },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className={`flex w-full flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold transition ${
                            item.active
                              ? 'bg-gradient-to-br from-violet-600 to-[#e06d53] text-white shadow-xs'
                              : 'text-slate-500'
                          }`}
                        >
                          <Icon className="h-4 w-4 mb-0.5" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-lg bg-violet-50 px-2 py-1 text-center text-[9px] font-bold text-violet-700 border border-violet-200">
                    16:9 HD Sahne
                  </div>
                </div>

                {/* Orta Sahne Tuvali: Elvan Hanım + Ders Tahtası */}
                <div className="md:col-span-7 p-2.5 sm:p-3.5 flex flex-col justify-center">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-[#fdf8f6] via-white to-violet-50/60 shadow-inner">
                    {/* Sınıf Arka Plan Dekoru & Akıllı Tahta */}
                    <svg
                      viewBox="0 0 420 262"
                      className="absolute inset-0 h-full w-full select-none"
                      aria-hidden="true"
                    >
                      {/* Sınıf Zemin Çizgisi ve Halı */}
                      <rect x="0" y="216" width="420" height="46" fill="#f3eef8" />
                      <line
                        x1="0"
                        y1="216"
                        x2="420"
                        y2="216"
                        stroke="#d8cce8"
                        strokeWidth="2"
                      />
                      <ellipse
                        cx="120"
                        cy="234"
                        rx="68"
                        ry="10"
                        fill="#e06d53"
                        opacity="0.16"
                      />

                      {/* Etkileşimli Akıllı Ders Tahtası (Sağ Taraf) */}
                      <g transform="translate(186, 26)">
                        <rect
                          x="0"
                          y="0"
                          width="212"
                          height="136"
                          rx="10"
                          fill="#ffffff"
                          stroke="#7c3aed"
                          strokeWidth="2.5"
                        />
                        {/* Tahta Üst Başlığı */}
                        <rect
                          x="0"
                          y="0"
                          width="212"
                          height="24"
                          rx="8"
                          fill="#4f46e5"
                        />
                        <circle cx="14" cy="12" r="3.5" fill="#e06d53" />
                        <circle cx="25" cy="12" r="3.5" fill="#fbbf24" />
                        <text
                          x="38"
                          y="15.5"
                          fontSize="9.5"
                          fontWeight="700"
                          fill="#ffffff"
                        >
                          Doğrusal Fonksiyon: y = 2x + 4
                        </text>

                        {/* Koordinat Ekseni ve Canlı Grafik */}
                        <line
                          x1="24"
                          y1="114"
                          x2="122"
                          y2="114"
                          stroke="#94a3b8"
                          strokeWidth="1.6"
                        />
                        <line
                          x1="24"
                          y1="38"
                          x2="24"
                          y2="114"
                          stroke="#94a3b8"
                          strokeWidth="1.6"
                        />
                        {/* Izgara çizgileri */}
                        <line
                          x1="24"
                          y1="88"
                          x2="122"
                          y2="88"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1="24"
                          y1="62"
                          x2="122"
                          y2="62"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        {/* Sütunlar */}
                        <rect
                          x="38"
                          y="88"
                          width="14"
                          height="26"
                          rx="3"
                          fill="#c4b5fd"
                        />
                        <rect
                          x="64"
                          y="68"
                          width="14"
                          height="46"
                          rx="3"
                          fill="#8b5cf6"
                        />
                        <rect
                          x="90"
                          y="46"
                          width="14"
                          height="68"
                          rx="3"
                          fill="#e06d53"
                        />
                        {/* Doğrusal Eğim Çizgisi */}
                        <path
                          d="M 32 102 L 60 80 L 88 58 L 112 40"
                          fill="none"
                          stroke="#e06d53"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="60" cy="80" r="3.5" fill="#4f46e5" />
                        <circle cx="88" cy="58" r="3.5" fill="#4f46e5" />
                        <circle cx="112" cy="40" r="4.5" fill="#e06d53" />

                        {/* Sağ Bilgi Kartı */}
                        <rect
                          x="132"
                          y="38"
                          width="68"
                          height="34"
                          rx="6"
                          fill="#fdf2ef"
                          stroke="#f5c2b6"
                          strokeWidth="1.2"
                        />
                        <text
                          x="166"
                          y="52"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="700"
                          fill="#9c3b26"
                        >
                          Eğim (m) = 2
                        </text>
                        <text
                          x="166"
                          y="64"
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="600"
                          fill="#e06d53"
                        >
                          Sabit = +4
                        </text>

                        <rect
                          x="132"
                          y="80"
                          width="68"
                          height="34"
                          rx="6"
                          fill="#f5f3ff"
                          stroke="#ddd6fe"
                          strokeWidth="1.2"
                        />
                        <text
                          x="166"
                          y="95"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="700"
                          fill="#5b21b6"
                        >
                          Soru Noktası
                        </text>
                        <text
                          x="166"
                          y="106"
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="600"
                          fill="#7c3aed"
                        >
                          00:08&apos;de Açılır
                        </text>
                      </g>
                    </svg>

                    {/* Elvan Hanım Konuşma Balonu */}
                    <div className="absolute left-3 top-2.5 z-20 max-w-[215px] rounded-xl border border-[#e06d53]/40 bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-xs sm:left-4 sm:top-3 sm:max-w-[250px]">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#c8563d]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#e06d53] animate-ping" />
                        <span>Elvan Hanım (Öğretmen)</span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] font-medium leading-snug text-slate-700 sm:text-[11px]">
                        {activePoseItem.speech}
                      </p>
                    </div>

                    {/* Gerçek ArticulatedCharacterRig ile Hareket Eden Elvan Hanım */}
                    <div className="absolute bottom-1 left-2 z-10 h-[84%] w-[44%] sm:left-4">
                      {/* Seçili Karakter Çerçevesi (Tasarım Ekranı Hissi) */}
                      <div className="pointer-events-none absolute inset-x-3 inset-y-2 rounded-xl border border-dashed border-[#e06d53]/60 bg-[#e06d53]/[0.02]">
                        <span className="absolute -top-2 left-2 rounded bg-[#e06d53] px-1.5 py-0.2 text-[8.5px] font-bold text-white shadow-2xs">
                          Elvan Hanım • {activePoseItem.label}
                        </span>
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full border border-white bg-[#e06d53]" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-[#e06d53]" />
                        <span className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full border border-white bg-[#e06d53]" />
                        <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-white bg-[#e06d53]" />
                      </div>

                      <div className="h-full w-full">
                        <ArticulatedCharacterRig
                          config={elvanConfig}
                          animTime={animTime}
                          assetId="char-pro-elvan"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sağ Denetçi Paneli (Canlı Hareket Seçici - Mobil ve Masaüstü Uyumlu) */}
                <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 bg-white p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[9.5px] font-extrabold tracking-wider text-[#e06d53] uppercase">
                          KARAKTER DENETÇİSİ
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">
                          Elvan Hanım
                        </h3>
                      </div>
                      <span
                        className="h-4 w-4 rounded-full border border-slate-200 shadow-2xs"
                        style={{ backgroundColor: '#e06d53' }}
                        title="Elvan Hanım Süveter Teması (#e06d53)"
                      />
                    </div>

                    <p className="mt-2 text-[10px] font-semibold text-slate-500">
                      Hareketi Canlı Test Et:
                    </p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 md:grid-cols-1">
                      {ELVAN_POSE_SEQUENCE.map((poseOpt, idx) => {
                        const isSelected = activePoseIndex === idx;
                        return (
                          <button
                            key={poseOpt.id}
                            type="button"
                            onClick={() => {
                              setManualPoseIndex(idx);
                              setIsPlaying(true);
                            }}
                            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold transition cursor-pointer ${
                              isSelected
                                ? 'border-[#e06d53] bg-gradient-to-r from-[#e06d53] to-violet-600 text-white shadow-xs'
                                : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-violet-300 hover:bg-violet-50/50'
                            }`}
                          >
                            <span className="truncate">{poseOpt.label}</span>
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                isSelected ? 'bg-white' : 'bg-[#e06d53]'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/70 p-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-violet-900">
                      <span>Dudak Senkronu</span>
                      <span className="text-[#e06d53]">Aktif</span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 h-2.5">
                      {[40, 85, 60, 95, 50, 80, 65, 90, 45, 75, 55, 85].map(
                        (h, i) => (
                          <span
                            key={i}
                            className="flex-1 rounded-full bg-gradient-to-t from-violet-600 to-[#e06d53] transition-all duration-300"
                            style={{
                              height: isPlaying
                                ? `${Math.max(25, ((h + Math.floor(animTime * 40 + i * 13)) % 100))}%`
                                : '30%',
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Alt Zaman Çizelgesi (BottomTimeline Simülasyonu) */}
              <div className="border-t border-slate-200 bg-slate-900 px-3 py-2.5 text-slate-200 sm:px-4">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">Zaman Çizelgesi</span>
                    <span className="rounded bg-[#e06d53]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ff9b85] border border-[#e06d53]/30">
                      {formattedTime} / 00:12.0
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualPoseIndex(null)}
                    className="text-[10px] font-semibold text-violet-300 hover:text-white transition cursor-pointer"
                  >
                    {manualPoseIndex !== null
                      ? 'Otomatik Döngüye Dön'
                      : 'Otomatik Senaryo Akışı'}
                  </button>
                </div>

                <div className="relative space-y-1.5 overflow-hidden rounded-lg bg-slate-800/90 p-2">
                  {/* Hareketli Playhead İmleci */}
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#e06d53] shadow-[0_0_8px_#e06d53]"
                    style={{
                      left: `calc(76px + (100% - 84px) * ${
                        playheadPercent / 100
                      })`,
                    }}
                  >
                    <div className=" -ml-1.5 h-2.5 w-3.5 rounded-b bg-[#e06d53]" />
                  </div>

                  {/* Kanal 1: Elvan Hanım Hareket */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 truncate text-[10px] font-semibold text-slate-300">
                      Elvan Hanım
                    </span>
                    <div className="grid h-4 flex-1 grid-cols-4 gap-1 rounded bg-slate-900/80 p-0.5">
                      {ELVAN_POSE_SEQUENCE.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-center rounded px-1 text-[8.5px] font-bold text-white truncate transition ${
                            activePoseIndex === idx
                              ? 'bg-[#e06d53]'
                              : 'bg-[#e06d53]/60'
                          }`}
                        >
                          {p.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kanal 2: Akıllı Tahta & Grafik */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 truncate text-[10px] font-semibold text-slate-300">
                      Ders Tahtası
                    </span>
                    <div className="h-3.5 flex-1 rounded bg-slate-900/80 p-0.5">
                      <div className="h-full w-5/6 rounded bg-gradient-to-r from-indigo-500 to-violet-500 px-2 text-[8px] font-bold text-white flex items-center">
                        Doğrusal Grafik Çizimi &amp; Soru Kartı
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alt 3 Temel İşlem Kartı (Elvan Hanım Süveter Rengi & Mor Tema Uyumlu, Mobil Duyarlı) */}
        <section className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
          <div className="group rounded-2xl border border-[#e06d53]/25 bg-white/90 p-5 shadow-sm backdrop-blur-xs transition hover:-translate-y-0.5 hover:border-[#e06d53]/50 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e06d53]/15 text-[#c8563d]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-base font-bold text-slate-900">
              Yeni animasyon oluştur
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Ücretsiz hesap açarak veya demoyu deneyerek Elvan Hanım ve diğer
              eğitim karakterleriyle ilk ders sahnenizi hemen hazırlayın.
            </p>
          </div>

          <div className="group rounded-2xl border border-violet-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-xs transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-base font-bold text-slate-900">
              Mevcut projelerine ulaş
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Hesabınıza giriş yaparak bulutta veya cihazınızda kaydettiğiniz
              tüm ders animasyonlarını tek ekrandan yönetin.
            </p>
          </div>

          <div className="group rounded-2xl border border-indigo-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-base font-bold text-slate-900">
              Son çalışmalarına devam et
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Yarım kalan sahnelerinizi, zaman çizelgesi kurgunuzu ve etkileşimli
              sorularınızı kaldığınız yerden düzenlemeye devam edin.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
