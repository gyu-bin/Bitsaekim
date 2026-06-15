export const colors = {
  light: {
    background: '#EDECE8',
    card: '#FFFFFF',
    surface: '#F7F6F3',
    border: 'rgba(20, 18, 13, 0.1)',
    text: '#12110E',
    textMid: '#4E4A44',
    textSub: '#8B857C',
    accent: '#A67F3D',
    accentLight: '#F3EBDD',
    accentDark: '#7A5C2A',
    accentMuted: 'rgba(166, 127, 61, 0.14)',
    onAccent: '#FFFFFF',
    overlay: 'rgba(18, 17, 14, 0.42)',
    tabBar: '#FFFFFF',
    tabBarBorder: 'rgba(20, 18, 13, 0.08)',
  },
  dark: {
    background: '#0C0B09',
    card: '#171512',
    surface: '#1E1B17',
    border: 'rgba(255, 255, 255, 0.09)',
    text: '#F4F1EA',
    textMid: '#C4BCAE',
    textSub: '#7A746A',
    accent: '#D4A96A',
    accentLight: '#2A2318',
    accentDark: '#B8935A',
    accentMuted: 'rgba(212, 169, 106, 0.16)',
    onAccent: '#14120D',
    overlay: 'rgba(0, 0, 0, 0.58)',
    tabBar: '#171512',
    tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export const palette = {
  gold: '#b8935a',
  goldLight: '#f5d98a',
  goldMuted: '#d4b88a',
  ink: '#1a160e',
  cream: '#f7f3ec',
  splash: '#f7edd8',
  white: '#ffffff',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
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

export const shadow = {
  sm: {
    shadowColor: '#14120D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#14120D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  accent: {
    shadowColor: '#B8935A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

export type ThemeName = 'light' | 'dark';
export type ThemeColors = (typeof colors)[ThemeName];
