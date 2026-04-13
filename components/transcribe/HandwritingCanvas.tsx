import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Phase 3: @shopify/react-native-skia 기반 손글씨 캔버스로 교체 예정.
 * 현재는 안내 플레이스홀더입니다.
 */
export function HandwritingCanvas() {
  const c = useThemeColors();
  return (
    <View style={[styles.box, { borderColor: c.border, backgroundColor: c.card }]}>
      <Text style={[styles.text, { color: c.textSub }]}>
        손글씨 모드는 Skia 연동 후 활성화됩니다. 타이핑 모드를 이용해 주세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.sans, fontSize: fontSize.sm, textAlign: 'center' },
});
