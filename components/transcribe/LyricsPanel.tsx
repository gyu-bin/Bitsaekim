import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LyricVerse } from '@/types';

type Props = {
  verse: LyricVerse;
  backgroundStory?: string;
  bibleVerse?: string;
  compact?: boolean;
};

export function LyricsPanel({ verse, backgroundStory, bibleVerse, compact }: Props) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [boxH, setBoxH] = useState<number | undefined>(compact ? 200 : undefined);

  const onLayout = (e: LayoutChangeEvent) => {
    if (compact && boxH === undefined) {
      setBoxH(Math.min(220, e.nativeEvent.layout.height));
    }
  };

  return (
    <View
      style={[styles.wrap, compact && boxH ? { maxHeight: boxH } : undefined]}
      onLayout={onLayout}
    >
      <Text style={[styles.label, { color: c.accent }]}>{verse.label}</Text>
      {verse.lines.map((line, i) => (
        <Text key={i} style={[styles.line, { color: c.text }]}>
          {line}
        </Text>
      ))}
      {!!bibleVerse && (
        <Text style={[styles.bible, { color: c.textMid }]}>{bibleVerse}</Text>
      )}
      {!!backgroundStory && (
        <>
          <TouchableOpacity onPress={() => setOpen(!open)}>
            <Text style={[styles.toggle, { color: c.accent }]}>
              배경 설명 {open ? '접기' : '펼치기'}
            </Text>
          </TouchableOpacity>
          {open && (
            <Text style={[styles.story, { color: c.textMid }]}>{backgroundStory}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.mono, fontSize: fontSize.xs, letterSpacing: 1 },
  line: { fontFamily: fonts.serif, fontSize: fontSize.md, lineHeight: fontSize.md * 1.9 },
  bible: { fontFamily: fonts.serif, fontSize: fontSize.sm, marginTop: 8, fontStyle: 'italic' },
  toggle: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm, marginTop: 10 },
  story: { fontFamily: fonts.sans, fontSize: fontSize.sm, lineHeight: 20, marginTop: 6 },
});
