import { AppState, Platform } from 'react-native';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

/**
 * RN(특히 iOS 시뮬레이터)에서 navigator.onLine이 없으면 TanStack Query가
 * 오프라인으로 판단해 fetch를 영원히 pause → isPending만 true인 무한 로딩이 납니다.
 */
if (Platform.OS !== 'web') {
  onlineManager.setOnline(true);
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });
    return () => sub.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      networkMode: 'always',
    },
  },
});
