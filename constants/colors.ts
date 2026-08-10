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

/**
 * 레거시 정원(파스텔) 토큰 — 홈은 미니멀 `colors`로 전환됨.
 * 남은 화면·컴포넌트 마이그레이션 전까지만 유지.
 */
export const garden = {
  light: {
    cream: '#FBF4E4',
    cream2: '#F5EAD2',
    card: '#FFFFFF',
    line: '#EADFC7',
    ink: '#4A3F30',
    inkSoft: '#7A6C56',
    muted: '#A99A80',
    green: '#7DB56A',
    greenSoft: '#C9E4B4',
    greenBg: '#EAF5E1',
    greenInk: '#3F6B2C',
    coral: '#F08A7C',
    coralBg: '#FBE3DE',
    coralInk: '#B04A3E',
    gold: '#C79A54',
    goldBg: '#F6ECD6',
    goldInk: '#8A6530',
    skyTop: '#CDE8F2',
    grass: '#B9D98C',
    grass2: '#A6CE78',
  },
  dark: {
    cream: '#1C1A14',
    cream2: '#2A2519',
    card: '#26221A',
    line: '#3A3327',
    ink: '#F0E7D4',
    inkSoft: '#C9BCA2',
    muted: '#A99A80',
    green: '#8FC57A',
    greenSoft: '#3A5230',
    greenBg: '#26311F',
    greenInk: '#A6D48C',
    coral: '#F0A08C',
    coralBg: '#3A2823',
    coralInk: '#F0B4A6',
    gold: '#D4A96A',
    goldBg: '#332A1A',
    goldInk: '#E8C992',
    skyTop: '#2C3A46',
    grass: '#3E5230',
    grass2: '#4C6138',
  },
} as const;

export type GardenColors = { [K in keyof (typeof garden)['light']]: string };

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
