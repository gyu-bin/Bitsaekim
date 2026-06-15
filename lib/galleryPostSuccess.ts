import { router } from 'expo-router';

import { showToast } from '@/stores/toastStore';

/** 나눔 작성 완료 → 피드(나눔 홈)로 이동 + 하단 토스트 */
export function completeGalleryPost(message = '나눔에 등록했어요') {
  router.replace('/(tabs)/gallery');
  requestAnimationFrame(() => showToast(message));
}
