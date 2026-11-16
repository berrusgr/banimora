import React from 'react';
import {
  Film,
  Layers,
  LogIn,
  Play,
  Sparkles,
  UserPlus,
  Video,
  Wand2,
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
    <div className="h-screen w-full overflow-y-auto bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Background radial glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[460px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              Banimora
            </span>
            <span className="ml-2 hidden rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 sm:inline-block">
              Studio
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenDemo}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 sm:inline-flex"
          >
            <Play className="h-3.5 w-3.5 text-indigo-400" />
            Demo Görüntüle
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <LogIn className="h-3.5 w-3.5 text-slate-300" />
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Kayıt Ol
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Copy & CTAs */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <Film className="h-3.5 w-3.5" />
              2D Animasyon ve İnteraktif Video Üretim Platformu
            </div>

            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl sm:leading-[1.12]">
              Dakikalar içinde{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                canlı 2D animasyonlar
              </span>{' '}
              ve eğitim videoları üretin.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Banimora ile karakterleri sahneye yerleştirin, zaman çizelgesinde
              hareket ve sesleri senkronize edin, etkileşimli içerikler ve
              profesyonel animasyon videoları hazırlayın.
            </p>

            {/* Primary 3 Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={onSignUp}
                data-testid="landing-signup-btn"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <UserPlus className="h-4 w-4" />
                Kayıt Ol
              </button>

              <button
                type="button"
                onClick={onSignIn}
                data-testid="landing-signin-btn"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <LogIn className="h-4 w-4 text-slate-300" />
                Giriş Yap
              </button>

              <button
                type="button"
                onClick={onOpenDemo}
                data-testid="landing-demo-btn"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-6 py-3.5 text-sm font-semibold text-indigo-200 transition hover:border-indigo-400/70 hover:bg-indigo-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <Play className="h-4 w-4 fill-indigo-300 text-indigo-300" />
                Demo Görüntüle
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Hesap oluşturmadan{' '}
              <button
                type="button"
                onClick={onOpenDemo}
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:text-indigo-200"
              >
                örnek stüdyo demosunu
              </button>{' '}
              hemen deneyebilirsiniz.
            </p>
          </div>

          {/* Right Stylized Studio Preview */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/50">
              {/* Mock Studio Window Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Banimora Studio — Sahne & Zaman Çizelgesi
                </span>
                <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  2D Rig
                </span>
              </div>

              {/* Mock Stage Canvas */}
              <div className="p-4 sm:p-5">
                <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <div className="relative flex flex-col items-center gap-3 px-4 text-center">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 shadow-inner">
                        <Wand2 className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15 shadow-inner">
                        <Video className="h-7 w-7 text-violet-300" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      Karakterler, kamera hareketleri, dudak senkronu ve
                      sahne geçişleri
                    </p>
                    <button
                      type="button"
                      onClick={onOpenDemo}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      Örnek Projeyi Aç
                    </button>
                  </div>
                </div>

                {/* Mock Timeline Strip */}
                <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Zaman Çizelgesi</span>
                    <span className="font-mono text-indigo-300">00:08.0</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-16 truncate text-[10px] text-slate-400">
                        Karakter
                      </span>
                      <div className="h-3 flex-1 rounded bg-slate-800/90 p-0.5">
                        <div className="h-full w-3/4 rounded bg-indigo-500/80" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 truncate text-[10px] text-slate-400">
                        Kamera
                      </span>
                      <div className="h-3 flex-1 rounded bg-slate-800/90 p-0.5">
                        <div className="ml-6 h-full w-1/2 rounded bg-violet-500/80" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 truncate text-[10px] text-slate-400">
                        Ses
                      </span>
                      <div className="h-3 flex-1 rounded bg-slate-800/90 p-0.5">
                        <div className="h-full w-2/3 rounded bg-emerald-500/75" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-white">
              Çoklu Sahne & Rig Editörü
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Hazır karakterler, nesneler ve kamera hareketleriyle dakikalar
              içinde sahneler oluşturun.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <Wand2 className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-white">
              Klasik ve ADDIE Üretim Modu
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Serbest animasyon kurgusu veya yapılandırılmış eğitsel tasarım
              akışıyla projelerinizi yönetin.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <Video className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-white">
              Bulut Senkronizasyonu & Video
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Projelerinizi hesabınızda güvenle saklayın, dilediğiniz cihazdan
              devam edin ve dışa aktarın.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
