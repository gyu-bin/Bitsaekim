import 'react-native-url-polyfill/auto';

import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { supabaseFetch } from '@/lib/supabaseFetch';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

/** @supabase/supabase-js는 빈 URL/키로 생성 시 즉시 throw → TestFlight(EAS)에서 env 누락 시 앱이 바로 종료됨 */
const OFFLINE_SUPABASE_URL = 'https://offline.placeholder.supabase.co';
const OFFLINE_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.offline-placeholder-not-configured';

export function resolveSupabase(): { url: string; anon: string; configured: boolean } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const url =
    extra?.supabaseUrl?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const anon =
    extra?.supabaseAnonKey?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    '';
  const configured = Boolean(url && anon && !url.includes('offline.placeholder'));
  if (!configured) {
    return { url: OFFLINE_SUPABASE_URL, anon: OFFLINE_SUPABASE_ANON_KEY, configured: false };
  }
  return { url, anon, configured: true };
}

function createSupabaseClient(): SupabaseClient {
  const resolved = resolveSupabase();
  const client = createClient(resolved.url, resolved.anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: supabaseFetch,
    },
  });
  if (__DEV__) {
    console.log(
      '[supabase]',
      resolved.configured ? `ready ${resolved.url}` : 'offline placeholder (env missing)'
    );
  }
  return client;
}

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!client) client = createSupabaseClient();
  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export function isSupabaseConfigured(): boolean {
  return resolveSupabase().configured;
}

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

export function formatSupabaseNetworkError(e: unknown): string {
  const msg =
    e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
      ? e.message
      : '';

  if (msg === 'SUPABASE_NOT_CONFIGURED') {
    return supabaseMissingConfigUserMessage();
  }

  const lower = msg.toLowerCase();
  const isNetworkLike =
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('aborterror') ||
    lower.includes('aborted') ||
    lower.includes('timeout') ||
    lower.includes('서버 응답이 없습니다');

  if (isNetworkLike) {
    const lines = [
      '서버에 연결하지 못했습니다.',
      '',
      '• Wi‑Fi 또는 모바일 데이터 연결을 확인해 주세요.',
      '• 개발 중이라면 Metro(터미널)를 Ctrl+C로 끈 뒤 `npx expo start -c`로 다시 시작해 보세요.',
      '• `.env`에 EXPO_PUBLIC_SUPABASE_URL·EXPO_PUBLIC_SUPABASE_ANON_KEY가 있는지 확인해 주세요.',
    ];
    if (__DEV__ && Platform.OS === 'ios') {
      lines.push(
        '',
        '• **iOS 시뮬레이터 18.4 이상**에서는 fetch 버그로 요청이 pending 될 수 있습니다.',
        '  Xcode → Simulator → iOS **18.3** 기기로 바꾸거나, **실기기 Expo Go**에서 시도해 보세요.',
        '• React Native DevTools(네트워크 탭)를 열어 두면 요청이 멈춘 것처럼 보일 수 있습니다. DevTools를 닫고 다시 시도해 보세요.'
      );
    }
    return lines.join('\n');
  }

  return msg || '서버에 연결할 수 없습니다. 네트워크와 설정을 확인해 주세요.';
}
