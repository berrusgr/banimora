import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  needsEmailVerification?: boolean;
}

export interface SupabaseAuthLike {
  getSession(): Promise<{ data: { session: Session | null }; error: { message: string } | null }>;
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { data: { subscription: { unsubscribe(): void } } };
  signUp(params: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
  }): Promise<{
    data: { user: User | null; session: Session | null };
    error: { message: string } | null;
  }>;
  signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{
    data: { user: User | null; session: Session | null };
    error: { message: string } | null;
  }>;
  signOut(): Promise<{ error: { message: string } | null }>;
  resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string }
  ): Promise<{ error: { message: string } | null }>;
  updateUser(attributes: { password: string }): Promise<{
    data: { user: User | null };
    error: { message: string } | null;
  }>;
}

export interface AuthStateSnapshot {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isRecoveryMode: boolean;
  needsEmailVerification: boolean;
}

export function translateSupabaseAuthError(rawMessage: string | undefined): string {
  if (!rawMessage) return 'Kimlik doğrulama işlemi sırasında beklenmeyen bir hata oluştu.';
  const lower = rawMessage.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'E-posta adresi veya parola hatalı.';
  }
  if (lower.includes('email not confirmed')) {
    return 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki doğrulama bağlantısını onaylayın.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunuyor.';
  }
  if (lower.includes('password should be at least')) {
    return 'Parola en az 6 karakter uzunluğunda olmalıdır.';
  }
  if (lower.includes('unable to validate email address') || lower.includes('invalid email')) {
    return 'Lütfen geçerli bir e-posta adresi girin.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Çok fazla deneme yapıldı. Lütfen kısa bir süre bekleyip tekrar deneyin.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Bulut sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin; yerel çalışmalarınız korunmaktadır.';
  }
  return rawMessage;
}

function defaultRedirectOrigin(): string | undefined {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return undefined;
}

export class AuthController {
  private readonly auth: SupabaseAuthLike | null;
  private state: AuthStateSnapshot;
  private readonly listeners = new Set<(state: AuthStateSnapshot) => void>();
  private unsubscribeAuth: (() => void) | null = null;

  constructor(auth: SupabaseAuthLike | null) {
    this.auth = auth;
    this.state = {
      isConfigured: auth !== null,
      isLoading: auth !== null,
      session: null,
      user: null,
      isAuthenticated: false,
      isRecoveryMode: false,
      needsEmailVerification: false,
    };
  }

  getState(): AuthStateSnapshot {
    return { ...this.state };
  }

  subscribe(listener: (state: AuthStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<AuthStateSnapshot>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  async initialize(): Promise<() => void> {
    if (!this.auth) {
      this.setState({ isLoading: false, isConfigured: false });
      return () => {};
    }

    const { data: subData } = this.auth.onAuthStateChange((event, session) => {
      const nextRecovery =
        event === 'PASSWORD_RECOVERY'
          ? true
          : event === 'SIGNED_OUT' || event === 'USER_UPDATED'
            ? false
            : this.state.isRecoveryMode;

      this.setState({
        session,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session?.user),
        isLoading: false,
        isRecoveryMode: nextRecovery,
        needsEmailVerification: session?.user ? false : this.state.needsEmailVerification,
      });
    });

    this.unsubscribeAuth = () => {
      subData.subscription.unsubscribe();
    };

    try {
      const { data } = await this.auth.getSession();
      this.setState({
        session: data.session,
        user: data.session?.user ?? null,
        isAuthenticated: Boolean(data.session?.user),
        isLoading: false,
      });
    } catch {
      this.setState({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }

    return () => {
      this.dispose();
    };
  }

  dispose(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.listeners.clear();
  }

  clearRecoveryMode(): void {
    this.setState({ isRecoveryMode: false });
  }

  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthActionResult> {
    if (!this.auth) {
      return {
        ok: false,
        error: 'Supabase yapılandırması bulunamadı. Uygulama yerel modda çalışıyor.',
      };
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { ok: false, error: 'E-posta ve parola alanları zorunludur.' };
    }

    try {
      const { data, error } = await this.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: defaultRedirectOrigin(),
          data: displayName?.trim() ? { display_name: displayName.trim() } : undefined,
        },
      });

      if (error) {
        return { ok: false, error: translateSupabaseAuthError(error.message) };
      }

      const needsVerification = Boolean(data.user && !data.session);
      this.setState({
        session: data.session,
        user: data.session?.user ?? null,
        isAuthenticated: Boolean(data.session?.user),
        needsEmailVerification: needsVerification,
      });

      return {
        ok: true,
        needsEmailVerification: needsVerification,
        message: needsVerification
          ? 'Kayıt başarılı! E-posta adresinize gönderilen doğrulama bağlantısını onaylayın.'
          : 'Kayıt ve giriş başarılı.',
      };
    } catch (err) {
      return {
        ok: false,
        error: translateSupabaseAuthError(err instanceof Error ? err.message : undefined),
      };
    }
  }

  async signInWithPassword(email: string, password: string): Promise<AuthActionResult> {
    if (!this.auth) {
      return {
        ok: false,
        error: 'Supabase yapılandırması bulunamadı. Uygulama yerel modda çalışıyor.',
      };
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { ok: false, error: 'E-posta ve parola alanları zorunludur.' };
    }

    try {
      const { data, error } = await this.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        return { ok: false, error: translateSupabaseAuthError(error.message) };
      }

      this.setState({
        session: data.session,
        user: data.session?.user ?? data.user ?? null,
        isAuthenticated: Boolean(data.session?.user ?? data.user),
        needsEmailVerification: false,
        isRecoveryMode: false,
      });

      return { ok: true, message: 'Giriş başarılı.' };
    } catch (err) {
      return {
        ok: false,
        error: translateSupabaseAuthError(err instanceof Error ? err.message : undefined),
      };
    }
  }

  async signOut(): Promise<AuthActionResult> {
    if (!this.auth) {
      this.setState({
        session: null,
        user: null,
        isAuthenticated: false,
        isRecoveryMode: false,
        needsEmailVerification: false,
      });
      return { ok: true };
    }

    try {
      const { error } = await this.auth.signOut();
      if (error) {
        return { ok: false, error: translateSupabaseAuthError(error.message) };
      }

      this.setState({
        session: null,
        user: null,
        isAuthenticated: false,
        isRecoveryMode: false,
        needsEmailVerification: false,
      });

      return {
        ok: true,
        message: 'Çıkış yapıldı. Yerel projeleriniz cihazınızda korunmaya devam ediyor.',
      };
    } catch (err) {
      return {
        ok: false,
        error: translateSupabaseAuthError(err instanceof Error ? err.message : undefined),
      };
    }
  }

  async resetPasswordForEmail(email: string): Promise<AuthActionResult> {
    if (!this.auth) {
      return {
        ok: false,
        error: 'Supabase yapılandırması bulunamadı. Uygulama yerel modda çalışıyor.',
      };
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { ok: false, error: 'Lütfen e-posta adresinizi girin.' };
    }

    try {
      const { error } = await this.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: defaultRedirectOrigin(),
      });

      if (error) {
        return { ok: false, error: translateSupabaseAuthError(error.message) };
      }

      return {
        ok: true,
        message: 'Parola sıfırlama bağlantısı e-posta adresinize gönderildi.',
      };
    } catch (err) {
      return {
        ok: false,
        error: translateSupabaseAuthError(err instanceof Error ? err.message : undefined),
      };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthActionResult> {
    if (!this.auth) {
      return {
        ok: false,
        error: 'Supabase yapılandırması bulunamadı. Uygulama yerel modda çalışıyor.',
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'Yeni parola en az 6 karakter uzunluğunda olmalıdır.' };
    }

    try {
      const { data, error } = await this.auth.updateUser({ password: newPassword });
      if (error) {
        return { ok: false, error: translateSupabaseAuthError(error.message) };
      }

      this.setState({
        user: data.user ?? this.state.user,
        isRecoveryMode: false,
      });

      return { ok: true, message: 'Parolanız başarıyla güncellendi.' };
    } catch (err) {
      return {
        ok: false,
        error: translateSupabaseAuthError(err instanceof Error ? err.message : undefined),
      };
    }
  }
}
