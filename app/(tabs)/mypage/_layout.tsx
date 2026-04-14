import { Stack } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeStore } from '@/stores/themeStore';

export default function MypageStackLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        /** iOS 뒤로가기 옆에 이전 라우트명(index)이 붙는 것 방지 */
        headerBackTitle: '',
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { ...typeface.sansMedium, fontSize: fontSize.md, color: c.text },
      }}
    >
      <Stack.Screen name="index" options={{ title: '마이페이지' }} />
      <Stack.Screen
        name="transcriptions"
        options={{
          headerShown: true,
          title: '필사한 곡',
          headerBackTitle: '',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="transcription/[id]"
        options={{
          headerShown: true,
          title: '필사 기록',
          headerBackTitle: '',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
