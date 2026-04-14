import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TranscriptionWorkCaptureHandle } from '@/types';

const LINE = 36;
const LINES = 8;

type Props = {
  /** 절이 바뀔 때마다 바꿔 주면 입력이 초기화됩니다 */
  verseKey: string;
};

/**
 * 제어 value를 쓰지 않아 iOS/Android에서 한글 IME 조합이 끊기지 않도록 합니다.
 * 내용은 ref에만 반영하고, 캡처 시에만 읽습니다.
 */
export const TypingCanvas = forwardRef<TranscriptionWorkCaptureHandle, Props>(function TypingCanvas(
  { verseKey },
  ref
) {
  const c = useThemeColors();
  const captureWrapRef = useRef<View>(null);
  const textContentRef = useRef('');

  useEffect(() => {
    textContentRef.current = '';
  }, [verseKey]);

  useImperativeHandle(ref, () => ({
    async captureToTempJpeg(): Promise<string | null> {
      if (!captureWrapRef.current) return null;
      if (!textContentRef.current.trim()) return null;
      try {
        const uri = await captureRef(captureWrapRef.current, {
          format: 'jpg',
          quality: 0.88,
          result: 'tmpfile',
        });
        return uri ?? null;
      } catch {
        return null;
      }
    },
  }));

  return (
    <View
      ref={captureWrapRef}
      collapsable={false}
      style={[styles.box, { borderColor: c.border, backgroundColor: c.card }]}
    >
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
        onChangeText={(t) => {
          textContentRef.current = t;
        }}
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
});

TypingCanvas.displayName = 'TypingCanvas';

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
    ...typeface.sans,
    fontSize: fontSize.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
});
