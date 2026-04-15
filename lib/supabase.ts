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

/**
 * Supabase가 빌드에 없을 때(초대 코드·DB 등 불가). 개발은 .env, 배포는 EAS 환경 변수 안내.
 */
export function supabaseMissingConfigUserMessage(): string {
  if (__DEV__) {
    return [
      'Supabase URL·anon 키가 없어 모임 참여를 할 수 없습니다.',
      '',
      '프로젝트 루트 `.env`에 아래를 넣고 Metro(개발 서버)를 **완전히 종료한 뒤 다시 시작**하세요.',
      '• EXPO_PUBLIC_SUPABASE_URL',
      '• EXPO_PUBLIC_SUPABASE_ANON_KEY',
      '',
      '(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 등은 app.config.ts에서도 읽습니다.)',
    ].join('\n');
  }
  return [
    '이 앱 빌드에 Supabase URL·키가 포함되어 있지 않습니다.',
    '',
    'expo.dev → 프로젝트 → Environment variables에',
    'EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY를 넣은 뒤',
    '**앱을 다시 빌드**해야 TestFlight·실기기에서 모임 기능이 동작합니다.',
  ].join('\n');
}
