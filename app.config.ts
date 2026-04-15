import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const supabaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ''
  ).trim();

  const supabaseAnonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    ''
  ).trim();

  /**
   * 시뮬레이터/로컬은 `.env`가 Metro·config 평가 시 잡히지만,
   * EAS Build는 클라우드에서 돌아가서 **Expo 대시보드의 Environment variables**만 process.env로 들어옵니다.
   * 키 없이 빌드하면 TestFlight 앱에서만 Supabase가 비는 현상이 납니다.
   */
  if (process.env.EAS_BUILD === 'true' && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error(
      [
        '[Bitsaekim] EAS 클라우드 빌드에 Supabase URL·anon 키가 없습니다.',
        '시뮬레이터는 로컬 .env를 읽지만, TestFlight용 빌드는 Expo 서버에서 app.config를 실행하므로 .env가 올라가지 않습니다.',
        '',
        'expo.dev → 프로젝트 → Environment variables → 빌드에 쓰는 환경(예: production)에 추가:',
        '  EXPO_PUBLIC_SUPABASE_URL',
        '  EXPO_PUBLIC_SUPABASE_ANON_KEY',
        '',
        'app.config.ts가 extra에 넣으려면 빌드 **설정 해석** 단계에서 값이 있어야 합니다.',
        'Expo에서 “Secret”만 쓰면 이 단계에 안 들어올 수 있으니, 문서에 맞게 Plain text 등으로 EAS Build에 노출되는지 확인하세요.',
      ].join('\n')
    );
  }

  const base = config as ExpoConfig;

  return {
    ...base,
    name: base.name ?? '빛새김',
    slug: base.slug ?? 'bitsaekim',
    extra: {
      ...(typeof base.extra === 'object' && base.extra !== null ? base.extra : {}),
      supabaseUrl,
      supabaseAnonKey,
    },
  };
};
