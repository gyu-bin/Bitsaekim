import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LyricVerse } from '@/types';

function parseLyricsFromPlainText(raw: string): LyricVerse[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const chunks = trimmed
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  return chunks.map((chunk, i) => ({
    label: `${i + 1}절`,
    lines: chunk
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0),
  }));
}

type Props = {
  onSubmit: (payload: {
    title: string;
    artist?: string;
    background_story?: string;
    bible_verse?: string;
    lyrics: LyricVerse[];
  }) => Promise<void>;
};

export function SongForm({ onSubmit }: Props) {
  const c = useThemeColors();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [background, setBackground] = useState('');
  const [bible, setBible] = useState('');
  const [lyricsText, setLyricsText] = useState('');
  const [loading, setLoading] = useState(false);

  const insertVerseBreak = () => {
    setLyricsText((prev) => (prev.length === 0 ? prev : `${prev.replace(/\s+$/, '')}\n\n`));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const verses = parseLyricsFromPlainText(lyricsText);
    if (verses.length === 0 || verses.every((v) => v.lines.length === 0)) {
      Alert.alert('가사 필요', '가사 입력란에 내용을 적어 주세요.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        artist: artist.trim() || undefined,
        background_story: background.trim() || undefined,
        bible_verse: bible.trim() || undefined,
        lyrics: verses,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: c.textSub }]}>곡 제목 *</Text>
      <Input value={title} onChangeText={setTitle} placeholder="예: 주님의 임재 앞에" />

      <Text style={[styles.label, { color: c.textSub }]}>아티스트</Text>
      <Input value={artist} onChangeText={setArtist} placeholder="선택" />

      <Text style={[styles.label, { color: c.textSub }]}>배경 설명</Text>
      <Input
        value={background}
        onChangeText={setBackground}
        placeholder="선택"
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      <Text style={[styles.label, { color: c.textSub }]}>성경 구절</Text>
      <Input value={bible} onChangeText={setBible} placeholder="선택" />

      <View style={styles.lyricsHeader}>
        <Text style={[styles.label, { color: c.textSub, marginBottom: 0, marginTop: 0 }]}>가사 *</Text>
        <TouchableOpacity onPress={insertVerseBreak} style={styles.hintBtn}>
          <Text style={{ color: c.accent, fontFamily: fonts.sansMedium, fontSize: fontSize.sm }}>
            + 다음 절(빈 줄)
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: c.textSub }]}>
        한 줄에 한 소절처럼 입력하세요. 절이 바뀌면「+ 다음 절」을 누르거나 키보드에서 빈 줄을 두 번 넣어 주세요. 저장 시 자동으로 1절·2절로 나뉩니다.
      </Text>

      <TextInput
        value={lyricsText}
        onChangeText={setLyricsText}
        placeholder={'예)\n주님 이곳에 임재하소서\n다스리소서 다스리소서\n\n(빈 줄 뒤에는 다음 절)'}
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

      <Button title="저장" onPress={handleSave} loading={loading} disabled={!title.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm, marginBottom: 4, marginTop: 8 },
  lyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  hintBtn: { paddingVertical: 4, paddingLeft: 8 },
  hint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 4,
  },
  lyricsArea: {
    minHeight: 220,
    fontSize: fontSize.md,
    fontFamily: fonts.sans,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
