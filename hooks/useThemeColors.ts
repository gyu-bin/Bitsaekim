import { colors } from '@/constants/colors';
import { useThemeStore } from '@/stores/themeStore';

export function useThemeColors() {
  const isDark = useThemeStore((s) => s.isDark);
  return colors[isDark ? 'dark' : 'light'];
}
