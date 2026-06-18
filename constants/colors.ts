/** 화이트·미니멀 — 필요한 것만, 얇은 선으로 구분 */
export const colors = {
  light: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    surface: '#F7F7F7',
    border: '#EBEBEB',
    text: '#111111',
    textMid: '#555555',
    textSub: '#999999',
    accent: '#A67F3D',
    accentLight: '#FAF8F5',
    accentDark: '#8A6530',
    accentMuted: 'rgba(166, 127, 61, 0.1)',
    onAccent: '#FFFFFF',
    success: '#3D9A66',
    danger: '#D64545',
    overlay: 'rgba(0, 0, 0, 0.35)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#EBEBEB',
    chip: '#FFFFFF',
  },
  dark: {
    background: '#0F0F0F',
    card: '#1A1A1A',
    surface: '#242424',
    border: '#2E2E2E',
    text: '#F5F5F5',
    textMid: '#B0B0B0',
    textSub: '#777777',
    accent: '#D4A96A',
    accentLight: '#1F1C18',
    accentDark: '#E8C992',
    accentMuted: 'rgba(212, 169, 106, 0.14)',
    onAccent: '#111111',
    success: '#5CB88A',
    danger: '#F08080',
    overlay: 'rgba(0, 0, 0, 0.55)',
    tabBar: '#1A1A1A',
    tabBarBorder: '#2E2E2E',
    chip: '#1A1A1A',
  },
} as const;

export const palette = {
  gold: '#a67f3d',
  goldLight: '#faf8f5',
  goldMuted: '#d4c4a8',
  ink: '#111111',
  cream: '#ffffff',
  splash: '#ffffff',
  white: '#ffffff',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  '3xl': 22,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  '3xl': 40,
} as const;

/** 기본은 그림자 없음. 꼭 필요할 때만 sm */
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export type ThemeName = 'light' | 'dark';
export type ThemeColors = (typeof colors)[ThemeName];
