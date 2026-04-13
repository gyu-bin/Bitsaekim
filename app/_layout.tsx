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
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { queryClient } from '@/lib/queryClient';
import { seedSongsIfEmpty } from '@/lib/seedSongsIfEmpty';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)/transcribe');
    }
  }, [enabled, isOnboarded, router, segments]);
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
      regular: { fontFamily: 'NotoSansKR_400Regular', fontWeight: '400' as const },
      medium: { fontFamily: 'NotoSansKR_500Medium', fontWeight: '500' as const },
      bold: { fontFamily: 'NotoSerifKR_700Bold', fontWeight: '700' as const },
      heavy: { fontFamily: 'NotoSerifKR_700Bold', fontWeight: '700' as const },
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

  useEffect(() => {
    if (!loaded || !hydrated) return;
    void SplashScreen.hideAsync();
    const task = InteractionManager.runAfterInteractions(() => {
      void seedSongsIfEmpty();
    });
    return () => task.cancel();
  }, [loaded, hydrated]);

  if (!loaded || !hydrated) {
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
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="leader" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
