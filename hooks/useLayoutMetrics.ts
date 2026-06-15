import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/colors';
import { tabBarClearance } from '@/constants/tabBar';

/** 화면 좌우 기본 패딩 — 기기 너비와 무관하게 동일 */
const SCREEN_GUTTER = spacing.lg;

export function useLayoutMetrics() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = screenWidth >= 768;
  const horizontalGutter = SCREEN_GUTTER;
  const contentWidth = screenWidth - horizontalGutter * 2;

  return {
    screenWidth,
    contentWidth,
    horizontalGutter,
    isWide,
    insets,
    listBottomPadding: tabBarClearance(insets.bottom, 16),
  };
}
