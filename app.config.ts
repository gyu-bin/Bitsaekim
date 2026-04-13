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
