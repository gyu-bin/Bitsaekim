import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

/** @supabase/supabase-js는 빈 URL/키로 생성 시 즉시 throw → TestFlight(EAS)에서 env 누락 시 앱이 바로 종료됨 */
const OFFLINE_SUPABASE_URL = 'https://offline.placeholder.supabase.co';
const OFFLINE_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.offline-placeholder-not-configured';

function resolveSupabase(): { url: string; anon: string; configured: boolean } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const url =
    extra?.supabaseUrl?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const anon =
    extra?.supabaseAnonKey?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    '';
  const configured = Boolean(url && anon);
  if (!configured) {
    return { url: OFFLINE_SUPABASE_URL, anon: OFFLINE_SUPABASE_ANON_KEY, configured: false };
  }
  return { url, anon, configured: true };
}

const resolved = resolveSupabase();

export const supabase = createClient(resolved.url, resolved.anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: resolved.configured,
    persistSession: resolved.configured,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured(): boolean {
  return resolved.configured;
}
