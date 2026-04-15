import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
} from '@expo-google-fonts/noto-sans-kr';
import {
  NotoSerifKR_400Regular,
  NotoSerifKR_700Bold,
} from '@expo-google-fonts/noto-serif-kr';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { useHydrateGatheringOwner } from '@/hooks/useHydrateGatheringOwner';
import { queryClient } from '@/lib/queryClient';
import { seedSongsIfEmpty } from '@/lib/seedSongsIfEmpty';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

/** 네이티브 스플래시 이미지가 충분히 보이도록, 준비 완료 후에도 최소 이 시간은 유지 */
const SPLASH_MIN_VISIBLE_MS = 2300;

function useUserStoreHydrated() {
  const [ok, setOk] = useState(() => useUserStore.persist.hasHydrated());
  useEffect(() => {
    if (useUserStore.persist.hasHydrated()) setOk(true);
    else {
      const done = useUserStore.persist.onFinishHydration(() => setOk(true));
      return done;
    }
  }, []);
  return ok;
}

function useRootNavigationLogic(enabled: boolean) {
  const isOnboarded = useUserStore((s) => s.isOnboarded);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    const inJoinGathering = String(segments[0] ?? '') === 'join-gathering';
    const inJoinDeepLink = String(segments[0] ?? '') === 'join';
    /** 모임 없을 때 새 모임 만들기 등 `leader/*` 로 들어온 경우 join 화면으로 덮어쓰지 않음 */
    const inLeader = root === 'leader';

    if (!isOnboarded && !inOnboarding && !inJoinDeepLink) {
      router.replace('/onboarding');
    } else if (
      isOnboarded &&
      !gatheringId &&
      !inJoinGathering &&
      !inJoinDeepLink &&
      !inLeader
    ) {
      router.replace('/join-gathering' as Href);
    } else if (isOnboarded && gatheringId && (inOnboarding || inJoinGathering || inJoinDeepLink)) {
      router.replace('/(tabs)/transcribe');
    }
  }, [enabled, gatheringId, isOnboarded, router, segments]);
}

function NavigationThemeBridge({ children }: { children: React.ReactNode }) {
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];
  const theme = {
    dark: isDark,
    colors: {
      primary: c.accent,
      background: c.background,
      card: c.card,
      text: c.text,
      border: c.border,
      notification: c.accent,
    },
    fonts: {
      regular: { fontFamily: 'NotoSansKR_400Regular', fontWeight: 'normal' as const },
      medium: { fontFamily: 'NotoSansKR_500Medium', fontWeight: 'normal' as const },
      bold: { fontFamily: 'NotoSerifKR_700Bold', fontWeight: 'normal' as const },
      heavy: { fontFamily: 'NotoSerifKR_700Bold', fontWeight: 'normal' as const },
    },
  };
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSerifKR_400Regular,
    NotoSerifKR_700Bold,
    DMMono_400Regular,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const hydrated = useUserStoreHydrated();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    if (!loaded || !hydrated) return;
    const id = setTimeout(() => setMinSplashElapsed(true), SPLASH_MIN_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [loaded, hydrated]);

  useEffect(() => {
    if (!loaded || !hydrated || !minSplashElapsed) return;
    void SplashScreen.hideAsync();
    const task = InteractionManager.runAfterInteractions(() => {
      void seedSongsIfEmpty();
    });
    return () => task.cancel();
  }, [loaded, hydrated, minSplashElapsed]);

  if (!loaded || !hydrated || !minSplashElapsed) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationThemeBridge>
          <RootStack />
        </NavigationThemeBridge>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  useRootNavigationLogic(true);
  useHydrateGatheringOwner();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="join-gathering" />
      <Stack.Screen name="join/[inviteCode]" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="leader" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
