import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Song } from '@/types';

type Props = {
  song: Song | null;
  onAddToSetlist: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favoriteBusy?: boolean;
  addBusy?: boolean;
  /** 제목 탭 시 (예: 전체 목록으로 접기) */
  onPressTitle?: () => void;
};

export function ContiLyricsPreview({
  song,
  onAddToSetlist,
  isFavorite,
  onToggleFavorite,
  favoriteBusy,
  addBusy,
  onPressTitle,
}: Props) {
  const c = useThemeColors();

  if (!song) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background }]}>
        <Feather name="music" size={32} color={c.textSub} />
        <Text style={[styles.emptyTitle, { color: c.textSub }]}>왼쪽에서 곡을 선택하세요</Text>
        <Text style={[styles.emptySub, { color: c.textSub }]}>가사를 확인한 뒤 콘티에 추가할 수 있어요</Text>
      </View>
    );
  }

  const verses = Array.isArray(song.lyrics) ? song.lyrics : [];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { borderBottomColor: c.border }]}>
        <View style={styles.titleBlock}>
          <Pressable
            onPress={onPressTitle}
            disabled={!onPressTitle}
            accessibilityRole={onPressTitle ? 'button' : undefined}
            accessibilityLabel={onPressTitle ? '목록만 보기' : undefined}
          >
            <Text style={[styles.songTitle, { color: c.text }]} numberOfLines={2}>
              {song.title}
            </Text>
          </Pressable>
          {!!song.artist && (
            <Text style={[styles.artist, { color: c.textSub }]} numberOfLines={1}>
              {song.artist}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onToggleFavorite}
          disabled={favoriteBusy}
          style={({ pressed }) => [
            styles.favBtn,
            { borderColor: c.border, opacity: pressed || favoriteBusy ? 0.65 : 1 },
          ]}
          accessibilityLabel={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          <Feather name="heart" size={22} color={isFavorite ? '#c45c48' : c.textSub} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {verses.length === 0 ? (
          <Text style={[styles.noLyrics, { color: c.textSub }]}>등록된 가사가 없습니다.</Text>
        ) : (
          verses.map((verse, vi) => (
            <View key={`${verse.label}-${vi}`} style={styles.verseBlock}>
              <Text style={[styles.verseLabel, { color: c.accent }]}>{verse.label}</Text>
              {verse.lines.map((line, li) => (
                <Text key={li} style={[styles.line, { color: c.text }]}>
                  {line}
                </Text>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.card }]}>
        <Button title="이 곡 콘티에 추가" onPress={onAddToSetlist} loading={addBusy} disabled={addBusy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0 },
  empty: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  emptyTitle: { ...typeface.sansMedium, fontSize: fontSize.md, textAlign: 'center', marginTop: 8 },
  emptySub: { ...typeface.sans, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  songTitle: { ...typeface.serifBold, fontSize: fontSize.md, lineHeight: 22 },
  artist: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4 },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 20 },
  verseBlock: { marginBottom: 16 },
  verseLabel: { ...typeface.mono, fontSize: fontSize.xs, letterSpacing: 1, marginBottom: 6 },
  line: { ...typeface.serif, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.85 },
  noLyrics: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 8 },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
