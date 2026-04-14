import { Stack } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeStore } from '@/stores/themeStore';

export default function GalleryStackLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { ...typeface.sansMedium, fontSize: fontSize.md, color: c.text },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="compose"
        options={{
          headerShown: true,
          title: '나눔에 올리기',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="share-chant"
        options={{
          headerShown: true,
          title: '찬양·링크 나눔',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
