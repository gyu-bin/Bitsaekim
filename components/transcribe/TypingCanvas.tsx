import { StyleSheet, TextInput, View } from 'react-native';

import { fontSize } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

const LINE = 36;
const LINES = 8;

type Props = {
  /** 절이 바뀔 때마다 바꿔 주면 입력이 초기화됩니다 */
  verseKey: string;
};

/**
 * 제어 value를 쓰지 않아 iOS/Android에서 한글 IME 조합이 끊기지 않도록 합니다.
 */
export function TypingCanvas({ verseKey }: Props) {
  const c = useThemeColors();

  return (
    <View style={[styles.box, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: LINES }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.guide,
              {
                top: i * LINE + LINE - 2,
                backgroundColor: c.border,
              },
            ]}
          />
        ))}
      </View>
      <TextInput
        key={verseKey}
        accessibilityLabel="타이핑 필사 입력"
        multiline
        defaultValue=""
        placeholder="이곳에 가사를 따라 써보세요..."
        placeholderTextColor={c.textSub}
        style={[
          styles.input,
          {
            color: c.text,
            lineHeight: LINE,
            minHeight: LINE * LINES,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  guide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  input: {
    fontSize: fontSize.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
});
