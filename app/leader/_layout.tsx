import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { StackBackButton } from '@/components/navigation/StackBackButton';
import { colors } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';

export default function LeaderLayout() {
  const role = useUserStore((s) => s.role);
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];

  useEffect(() => {
    if (role !== 'leader') {
      Alert.alert('권한', '인도자만 이용할 수 있습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)/mypage') },
      ]);
    }
  }, [role, router]);

  if (role !== 'leader') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: c.text,
        headerStyle: { backgroundColor: c.background },
        contentStyle: { backgroundColor: c.background },
        headerLeft: () => <StackBackButton fallbackHref="/(tabs)/mypage" />,
      }}
    >
      <Stack.Screen name="gathering/create" options={{ title: '모임 만들기' }} />
      <Stack.Screen name="worship/create" options={{ title: '예배 생성' }} />
      <Stack.Screen name="worship/[id]/edit" options={{ title: '예배 수정' }} />
      <Stack.Screen name="worship/[id]/conti" options={{ title: '콘티 편성' }} />
      <Stack.Screen name="song/create" options={{ title: '찬양 추가' }} />
    </Stack>
  );
}
