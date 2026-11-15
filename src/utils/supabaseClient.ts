import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnvConfig {
  url: string;
  publishableKey: string;
}

export interface SupabaseEnvSource {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

function readRuntimeEnv(): SupabaseEnvSource {
  const metaEnv =
    typeof import.meta !== 'undefined' &&
    typeof (import.meta as unknown as { env?: unknown }).env === 'object'
      ? ((import.meta as unknown as { env?: SupabaseEnvSource }).env ?? {})
      : {};

  return {
    VITE_SUPABASE_URL: metaEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseConfig(
  envSource: SupabaseEnvSource = readRuntimeEnv()
): SupabaseEnvConfig | null {
  const url =
    typeof envSource.VITE_SUPABASE_URL === 'string' ? envSource.VITE_SUPABASE_URL.trim() : '';
  const publishableKey =
    typeof envSource.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
      ? envSource.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : '';

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured(envSource?: SupabaseEnvSource): boolean {
  return getSupabaseConfig(envSource) !== null;
}

export function createSupabaseBrowserClient(
  envSource?: SupabaseEnvSource
): SupabaseClient | null {
  const config = getSupabaseConfig(envSource);
  if (!config) {
    return null;
  }

  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  cachedClient = createSupabaseBrowserClient();
  return cachedClient;
}

export function resetSupabaseClientForTests(): void {
  cachedClient = undefined;
}
