import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BanimoraLogo } from './BanimoraLogo';

export type AuthModalTab = 'signin' | 'signup' | 'reset' | 'recovery';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthModalTab;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  onClose,
  onAuthSuccess,
}) => {
  const {
    isConfigured,
    isRecoveryMode,
    signInWithPassword,
    signUp,
    resetPasswordForEmail,
    updatePassword,
    clearRecoveryMode,
  } = useAuth();

  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isRecoveryMode) {
      setTab('recovery');
    } else if (isOpen) {
      setTab(initialTab);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, initialTab, isRecoveryMode]);

  if (!isOpen && !isRecoveryMode) return null;

  const switchTab = (next: AuthModalTab) => {
    setTab(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    if (isRecoveryMode) {
      clearRecoveryMode();
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg('Bulut kimlik doğrulaması yapılandırılmamış. Uygulama yerel modda çalışıyor.');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'signin') {
        const res = await signInWithPassword(email, password);
        if (!res.ok) {
          setErrorMsg(res.error ?? 'Giriş yapılamadı.');
        } else {
          onAuthSuccess?.();
          onClose();
        }
        return;
      }

      if (tab === 'signup') {
        if (password.length < 6) {
          setErrorMsg('Parola en az 6 karakter uzunluğunda olmalıdır.');
          return;
        }
        const res = await signUp(email, password, displayName);
        if (!res.ok) {
          setErrorMsg(res.error ?? 'Kayıt oluşturulamadı.');
        } else {
          setSuccessMsg(
            res.message ??
              'Kayıt başarılı! E-posta adresinize gönderilen doğrulama bağlantısını onaylayın.'
          );
          if (!res.needsEmailVerification) {
            onAuthSuccess?.();
            onClose();
          }
        }
        return;
      }

      if (tab === 'reset') {
        const res = await resetPasswordForEmail(email);
        if (!res.ok) {
          setErrorMsg(res.error ?? 'Sıfırlama bağlantısı gönderilemedi.');
        } else {
          setSuccessMsg(
            res.message ?? 'Parola sıfırlama bağlantısı e-posta adresinize gönderildi.'
          );
        }
        return;
      }

      if (tab === 'recovery') {
        if (password.length < 6) {
          setErrorMsg('Yeni parola en az 6 karakter uzunluğunda olmalıdır.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Girilen parolalar birbiriyle eşleşmiyor.');
          return;
        }
        const res = await updatePassword(password);
        if (!res.ok) {
          setErrorMsg(res.error ?? 'Parola güncellenemedi.');
        } else {
          setSuccessMsg(res.message ?? 'Parolanız güncellendi.');
          setPassword('');
          setConfirmPassword('');
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <BanimoraLogo size={34} className="rounded-xl shadow-xs" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {tab === 'signup'
                  ? 'Öğretmen Hesabı Oluştur'
                  : tab === 'reset'
                    ? 'Parola Sıfırlama'
                    : tab === 'recovery'
                      ? 'Yeni Parola Belirle'
                      : 'Banimora Hesabına Giriş'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tab !== 'recovery' && (
          <div className="flex border-b border-slate-100 bg-slate-50/40 px-5 pt-2 gap-2">
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === 'signin'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === 'signup'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Kayıt Ol
            </button>
            <button
              type="button"
              onClick={() => switchTab('reset')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === 'reset'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Şifremi Unuttum
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {!isConfigured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Supabase ortam anahtarı yapılandırılmadığı için bulut oturumu kapalı. Yerel çalışma
              modu aktif.
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ad Soyad (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Örn. Ayşe Yılmaz"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          )}

          {tab !== 'recovery' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ogretmen@okul.edu.tr"
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {(tab === 'signin' || tab === 'signup' || tab === 'recovery') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tab === 'recovery' ? 'Yeni Parola' : 'Parola'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          )}

          {tab === 'recovery' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yeni Parola (Tekrar)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Parolanızı tekrar girin"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          )}

          {tab === 'signup' && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Kayıt sonrasında e-posta adresinize bir doğrulama bağlantısı gönderilir. Bağlantıyı
              onayladıktan sonra giriş yapabilirsiniz.
            </p>
          )}

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting || !isConfigured}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              {submitting
                ? 'İşleniyor...'
                : tab === 'signup'
                  ? 'Kayıt Ol'
                  : tab === 'reset'
                    ? 'Sıfırlama Bağlantısı Gönder'
                    : tab === 'recovery'
                      ? 'Parolayı Güncelle'
                      : 'Giriş Yap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
