import { Feather } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  /** 스택에 이전 화면이 없을 때(딥링크 등) */
  fallbackHref?: Href;
};

export function StackBackButton({ fallbackHref = '/(tabs)/transcribe' }: Props) {
  const router = useRouter();
  const c = useThemeColors();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallbackHref);
      }}
      style={styles.hit}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="뒤로 가기"
    >
      <Feather name="chevron-left" size={26} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: 6,
    paddingRight: 12,
    marginLeft: 4,
    justifyContent: 'center',
  },
});
