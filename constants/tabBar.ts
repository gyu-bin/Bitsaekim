import { Platform } from 'react-native';

/** 탭 아이콘·라벨 영역 높이 (`AppTabBar`) */
export const TAB_BAR_CONTENT_HEIGHT = 46;

export const TAB_BAR_BOTTOM_INSET_MIN = Platform.OS === 'ios' ? 0 : 0;

/** 화면 하단 여백 — 리스트·FAB 등 */
export function tabBarClearance(safeAreaBottom: number, gap = 12): number {
  return TAB_BAR_CONTENT_HEIGHT + safeAreaBottom + gap;
}

/** @deprecated alias */
export const TAB_BAR_HEIGHT = TAB_BAR_CONTENT_HEIGHT;

export function floatingTabBarClearance(safeAreaBottom: number, gap = 12): number {
  return tabBarClearance(safeAreaBottom, gap);
}
