import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * 등록되지 않은 경로로 들어올 때 Expo Router가 보여 주는 화면입니다.
 * 잘못된 링크·주소 입력 시에만 보입니다.
 */
export default function NotFoundScreen() {
  const c = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.text }]}>이 주소에는 화면이 없습니다</Text>
        <Text style={[styles.sub, { color: c.textSub }]}>
          링크가 잘못되었거나 삭제된 페이지일 수 있어요. 아래에서 돌아가 주세요.
        </Text>
        <Link href="/(tabs)/transcribe" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>필사 탭으로</Text>
        </Link>
        <Link href="/(tabs)/gallery" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>나눔 탭으로</Text>
        </Link>
        <Link href="/(tabs)/mypage" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>마이페이지로</Text>
        </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fonts.sansMedium,
    textAlign: 'center',
  },
  sub: {
    marginTop: 12,
    fontSize: fontSize.sm,
    fontFamily: fonts.sans,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  link: {
    marginTop: 14,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: fontSize.base,
    fontFamily: fonts.sansMedium,
  },
});
