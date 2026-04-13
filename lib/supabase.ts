import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function resolveSupabase(): { url: string; anon: string } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const url =
    extra?.supabaseUrl?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const anon =
    extra?.supabaseAnonKey?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    '';
  return { url, anon };
}

const { url, anon } = resolveSupabase();

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anon);
}
