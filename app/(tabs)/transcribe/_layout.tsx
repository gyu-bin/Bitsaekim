import { Stack } from 'expo-router';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { colors } from '@/constants/colors';
import { typeface } from '@/constants/fonts';
import { useThemeStore } from '@/stores/themeStore';

const back = () => <StackBackButton fallbackHref="/(tabs)/transcribe" />;

export default function TranscribeLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerTintColor: c.text,
        headerStyle: { backgroundColor: c.background },
        contentStyle: { backgroundColor: c.background },
        headerTitleStyle: { ...typeface.sansMedium, color: c.text },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[worshipId]/[setlistId]"
        options={{
          headerShown: true,
          title: '콘티',
          headerLeft: back,
        }}
      />
      <Stack.Screen
        name="write/[songId]"
        options={{
          headerShown: true,
          title: '필사',
          headerLeft: back,
        }}
      />
    </Stack>
  );
}
