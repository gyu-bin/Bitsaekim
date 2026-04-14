import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LyricVerse } from '@/types';

/** 통째 텍스트 → DB용 1절(줄 단위). 필사 화면은 이 구조를 그대로 씁니다. */
function plainTextToLyrics(raw: string): LyricVerse[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  return [{ label: '1절', lines }];
}

type Props = {
  onSubmit: (payload: { title: string; lyrics: LyricVerse[] }) => Promise<void>;
};

/** 한글 IME: 제목·가사 모두 비제어(ref + defaultValue). */
export function SongForm({ onSubmit }: Props) {
  const c = useThemeColors();
  const titleRef = useRef('');
  const lyricsRef = useRef('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const title = titleRef.current.trim();
    if (!title) {
      Alert.alert('알림', '곡 제목을 입력해 주세요.');
      return;
    }
    const verses = plainTextToLyrics(lyricsRef.current);
    if (verses.length === 0) {
      Alert.alert('가사 필요', '가사를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ title, lyrics: verses });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: c.textSub }]}>곡 제목 *</Text>
      <Input
        defaultValue=""
        placeholder="예: 주님의 임재 앞에"
        onChangeText={(t) => {
          titleRef.current = t;
        }}
      />

      <Text style={[styles.label, { color: c.textSub }]}>가사 *</Text>
      <TextInput
        defaultValue=""
        onChangeText={(t) => {
          lyricsRef.current = t;
        }}
        placeholder="가사를 입력하세요"
        placeholderTextColor={c.textSub}
        multiline
        textAlignVertical="top"
        scrollEnabled
        style={[
          styles.lyricsArea,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.card,
          },
        ]}
      />

      <Button title="저장" onPress={handleSave} loading={loading} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { ...typeface.sansMedium, fontSize: fontSize.sm, marginBottom: 4, marginTop: 8 },
  lyricsArea: {
    minHeight: 220,
    fontSize: fontSize.md,
    ...typeface.sans,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
