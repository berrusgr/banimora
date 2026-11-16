import React from 'react';
import {
  ArrowRight,
  Clock,
  FolderOpen,
  LogIn,
  Play,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onOpenDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignUp,
  onSignIn,
  onOpenDemo,
}) => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#f8fafc] text-slate-900">
      {/* Hafif Hareketli Aydınlık Arka Plan Animasyonları */}
      <style>{`
        @keyframes banimoraFloatSlow {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
          50% { transform: translate3d(24px, -18px, 0) scale(1.05); }
        }
        @keyframes banimoraFloatReverse {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
          50% { transform: translate3d(-22px, 16px, 0) scale(1.04); }
        }
        @keyframes banimoraBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes banimoraWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-16deg); }
        }
        @keyframes banimoraPlayhead {
          0% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .banimora-drift-1 { animation: banimoraFloatSlow 14s ease-in-out infinite; }
        .banimora-drift-2 { animation: banimoraFloatReverse 17s ease-in-out infinite; }
        .banimora-drift-3 { animation: banimoraFloatSlow 20s ease-in-out infinite reverse; }
        .banimora-bob { animation: banimoraBob 3.6s ease-in-out infinite; }
        .banimora-wave { transform-origin: 86px 92px; animation: banimoraWave 2.4s ease-in-out infinite; }
        .banimora-playhead { animation: banimoraPlayhead 5.5s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .banimora-drift-1, .banimora-drift-2, .banimora-drift-3,
          .banimora-bob, .banimora-wave, .banimora-playhead {
            animation: none !important;
          }
        }
      `}</style>

      {/* Hareketli Pastel Arka Plan Katmanı */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* İnce nokta deseni */}
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.28) 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
        {/* Yumuşak hareket eden pastel renk alanları */}
        <div className="banimora-drift-1 absolute -top-28 -left-20 h-[420px] w-[420px] rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="banimora-drift-2 absolute top-1/4 -right-24 h-[380px] w-[380px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="banimora-drift-3 absolute -bottom-24 left-1/3 h-[340px] w-[380px] rounded-full bg-amber-100/60 blur-3xl" />
      </div>

      {/* Üst Çubuk */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Banimora
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700 backdrop-blur-xs transition hover:border-slate-300 hover:bg-white"
          >
            <LogIn className="h-3.5 w-3.5 text-slate-500" />
            Giriş Yap
          </button>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Sol: Mesaj ve 3 Ana Eylem */}
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-xs font-medium text-indigo-700 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Öğretmenler için 2D Eğitim Animasyonu
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.14]">
              Dersleriniz için{' '}
              <span className="text-indigo-600">canlı ve anlaşılır</span>{' '}
              animasyonlar hazırlayın.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Teknik bilgi gerektirmeden yeni bir animasyon başlatın, kayıtlı
              projelerinize ulaşın veya son çalışmalarınıza kaldığınız yerden
              devam edin.
            </p>

            {/* Öncelikli 3 Eylem */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center">
              <button
                type="button"
                onClick={onSignUp}
                data-testid="landing-signup-btn"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusCircle className="h-4 w-4 shrink-0" />
                Kayıt Ol
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onSignIn}
                data-testid="landing-signin-btn"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white/95 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-slate-600" />
                Giriş Yap
              </button>

              <button
                type="button"
                onClick={onOpenDemo}
                data-testid="landing-demo-btn"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50/90 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
              >
                <Play className="h-4 w-4 shrink-0 fill-indigo-600 text-indigo-600" />
                Demo Görüntüle
              </button>
            </div>
          </div>

          {/* Sağ: Aydınlık, Canlı Mini Sahne Önizlemesi */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-lg shadow-slate-200/70 backdrop-blur-sm sm:p-5">
              {/* Aydınlık Sahne Alanı */}
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-sky-50 via-white to-indigo-50/50">
                {/* Hareketli Sahne Öğeleri */}
                <svg
                  viewBox="0 0 360 210"
                  className="h-full w-full select-none"
                  aria-hidden="true"
                >
                  {/* Sınıf Tahtası */}
                  <rect
                    x="150"
                    y="28"
                    width="172"
                    height="98"
                    rx="10"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />
                  <rect x="166" y="44" width="76" height="8" rx="4" fill="#6366f1" opacity="0.85" />
                  <rect x="166" y="60" width="128" height="6" rx="3" fill="#cbd5e1" />
                  <rect x="166" y="74" width="104" height="6" rx="3" fill="#cbd5e1" />
                  {/* Tahta üzerinde küçük grafik */}
                  <path
                    d="M 172 110 L 198 94 L 224 102 L 254 84"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="254" cy="84" r="4" fill="#0ea5e9" />

                  {/* Zemin */}
                  <line x1="24" y1="172" x2="336" y2="172" stroke="#e2e8f0" strokeWidth="2" />

                  {/* El Sallayan Öğretmen Karakteri (Canlı Hareket) */}
                  <g className="banimora-bob">
                    {/* Gövde */}
                    <rect x="64" y="88" width="28" height="44" rx="12" fill="#4f46e5" />
                    {/* Bacaklar */}
                    <line x1="72" y1="132" x2="70" y2="168" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                    <line x1="84" y1="132" x2="86" y2="168" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                    {/* Sol Kol */}
                    <line x1="66" y1="96" x2="52" y2="122" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" />
                    {/* El Sallayan Sağ Kol */}
                    <g className="banimora-wave">
                      <line x1="90" y1="96" x2="112" y2="74" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" />
                      <circle cx="114" cy="72" r="4.5" fill="#fed7aa" />
                    </g>
                    {/* Baş */}
                    <circle cx="78" cy="68" r="16" fill="#fed7aa" />
                    <path
                      d="M 62 66 C 62 52, 94 52, 94 66"
                      fill="#312e81"
                    />
                    {/* Gülümseme */}
                    <circle cx="73" cy="68" r="1.6" fill="#1e293b" />
                    <circle cx="83" cy="68" r="1.6" fill="#1e293b" />
                    <path d="M 74 74 Q 78 78 82 74" fill="none" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
                  </g>

                  {/* Konuşma Balonu */}
                  <g className="banimora-bob" style={{ animationDelay: '0.6s' }}>
                    <rect x="104" y="24" width="68" height="26" rx="10" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5" />
                    <text
                      x="138"
                      y="41"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#4338ca"
                    >
                      Merhaba!
                    </text>
                  </g>
                </svg>
              </div>

              {/* Aydınlık Mini Zaman Çizelgesi */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Zaman Çizelgesi</span>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    Canlı Önizleme
                  </span>
                </div>
                <div className="relative space-y-1.5 overflow-hidden">
                  {/* Hareket eden playhead çizgisi */}
                  <div className="banimora-playhead pointer-events-none absolute inset-y-0 left-14 right-0 z-10">
                    <div className="h-full w-0.5 bg-indigo-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] font-medium text-slate-500">Hareket</span>
                    <div className="h-3 flex-1 rounded-md bg-slate-200/80 p-0.5">
                      <div className="h-full w-3/4 rounded bg-indigo-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] font-medium text-slate-500">Ses</span>
                    <div className="h-3 flex-1 rounded-md bg-slate-200/80 p-0.5">
                      <div className="ml-6 h-full w-2/3 rounded bg-sky-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Temel Kullanıcı İşlemi Özeti */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200/90 bg-white/85 p-5 backdrop-blur-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <PlusCircle className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Yeni animasyon oluştur
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Ücretsiz hesap açarak veya demoyu deneyerek hemen ilk sahnenizi
              hazırlamaya başlayın.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white/85 p-5 backdrop-blur-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <FolderOpen className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Mevcut projelerine ulaş
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Hesabınıza giriş yaparak daha önce kaydettiğiniz tüm ders
              animasyonlarını görüntüleyin.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white/85 p-5 backdrop-blur-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Son çalışmalarına devam et
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Yarım kalan projelerinizi kaldığınız yerden açıp düzenlemeye
              devam edin.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
