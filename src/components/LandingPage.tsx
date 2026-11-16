import React from 'react';
import { ArrowRight, FolderOpen, LogIn, Play, PlusCircle, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen w-full overflow-y-auto bg-slate-50 text-slate-900">
      {/* Sade Üst Çubuk */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Banimora
          </span>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <LogIn className="h-3.5 w-3.5 text-slate-500" />
          Giriş Yap
        </button>
      </header>

      {/* Ana Karşılama Alanı */}
      <main className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-10 text-center sm:px-8 sm:pt-16">
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Öğretmenler için 2D Eğitim Animasyonu
        </span>

        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.15]">
          Dersleriniz için sade ve anlaşılır animasyonlar hazırlayın.
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Teknik bilgi gerektirmeden yeni bir animasyon başlatın, mevcut
          projelerinize ulaşın veya yarım kalan çalışmalarınıza devam edin.
        </p>

        {/* Öncelikli 3 Kullanıcı İşlemi */}
        <div className="mt-8 flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onSignUp}
            data-testid="landing-signup-btn"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" />
            Yeni Animasyon İçin Kayıt Ol
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onSignIn}
            data-testid="landing-signin-btn"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            <FolderOpen className="h-4 w-4 text-slate-600" />
            Projelerime Giriş Yap
          </button>

          <button
            type="button"
            onClick={onOpenDemo}
            data-testid="landing-demo-btn"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
          >
            <Play className="h-4 w-4 fill-indigo-600 text-indigo-600" />
            Demo Görüntüle
          </button>
        </div>

        {/* Sade Başlangıç Rehberi (3 Temel Akış) */}
        <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Yeni animasyon oluştur
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Ücretsiz hesap açarak veya demoyu deneyerek hemen ilk sahnenizi
              hazırlamaya başlayın.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Mevcut projelerine ulaş
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Hesabınıza giriş yaparak daha önce kaydettiğiniz tüm ders
              animasyonlarını görüntüleyin.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Son çalışmalarına devam et
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Yarım kalan projelerinizi kaldığınız yerden açıp düzenlemeye
              devam edin.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
