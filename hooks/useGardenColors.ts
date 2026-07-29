import { garden, type GardenColors } from '@/constants/colors';
import { useThemeStore } from '@/stores/themeStore';

/** 게임화(정원) 화면 전용 파스텔 팔레트. `useThemeColors`의 정원 버전. */
export function useGardenColors(): GardenColors {
  const isDark = useThemeStore((s) => s.isDark);
  return garden[isDark ? 'dark' : 'light'];
}
