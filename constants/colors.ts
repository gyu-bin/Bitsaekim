export const colors = {
  light: {
    background: '#faf8f4',
    card: '#ffffff',
    border: '#ede8e0',
    text: '#1a160e',
    textMid: '#4a3f2f',
    textSub: '#9a8c78',
    accent: '#b8935a',
    accentLight: '#fdf4e7',
    accentDark: '#8a6a32',
  },
  dark: {
    background: '#141008',
    card: '#1e1608',
    border: '#2a2010',
    text: '#f0ece4',
    textMid: '#c0b090',
    textSub: '#6a5a44',
    accent: '#d4a96a',
    accentLight: '#2a2010',
    accentDark: '#b8935a',
  },
} as const;

export const palette = {
  gold: '#b8935a',
  goldLight: '#f5d98a',
  ink: '#1a160e',
  cream: '#faf8f4',
  white: '#ffffff',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export type ThemeName = 'light' | 'dark';
