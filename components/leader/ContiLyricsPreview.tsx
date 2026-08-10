import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SongSheetViewer } from '@/components/transcribe/SongSheetViewer';
import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useDeleteSongSheet, useSongSheets, useUploadSongSheet } from '@/hooks/useSongSheets';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/stores/userStore';
import type { Song } from '@/types';

type Props = {
  song: Song | null;
  onAddToSetlist: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favoriteBusy?: boolean;
  addBusy?: boolean;
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
  const [tab, setTab] = useState<'lyrics' | 'sheet'>('lyrics');
  const [viewerOpen, setViewerOpen] = useState(false);
  const deviceId = useUserStore((s) => s.deviceId);
  const role = useUserStore((s) => s.role);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const canUpload =
    role === 'leader' || (!!deviceId && !!gatheringOwnerDeviceId && deviceId === gatheringOwnerDeviceId);

  const { data: sheets = [], isLoading: sheetsLoading } = useSongSheets(song?.id);
  const upload = useUploadSongSheet(song?.id);
  const remove = useDeleteSongSheet(song?.id);

  if (!song) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background }]}>
        <Feather name="music" size={32} color={c.textSub} />
        <Text style={[styles.emptyTitle, { color: c.textSub }]}>왼쪽에서 곡을 선택하세요</Text>
        <Text style={[styles.emptySub, { color: c.textSub }]}>
          가사·악보를 확인한 뒤 콘티에 추가할 수 있어요
        </Text>
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

      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => setTab('lyrics')}
          style={[styles.tab, tab === 'lyrics' && { borderBottomColor: c.accent }]}
        >
          <Text style={{ color: tab === 'lyrics' ? c.text : c.textSub, ...typeface.sansMedium }}>
            가사
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('sheet')}
          style={[styles.tab, tab === 'sheet' && { borderBottomColor: c.accent }]}
        >
          <Text style={{ color: tab === 'sheet' ? c.text : c.textSub, ...typeface.sansMedium }}>
            악보{sheets.length > 0 ? ` (${sheets.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {tab === 'lyrics' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
      ) : (
        <View style={styles.sheetPane}>
          {sheetsLoading ? (
            <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
          ) : sheets.length === 0 ? (
            <Text style={[styles.noLyrics, { color: c.textSub, padding: 16 }]}>
              등록된 악보가 없습니다.
            </Text>
          ) : (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {sheets.map((s) => (
                <Pressable key={s.id} onPress={() => setViewerOpen(true)} style={styles.sheetThumb}>
                  <Image
                    source={{ uri: s.image_url }}
                    style={styles.sheetImg}
                    resizeMode="contain"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
          {canUpload ? (
            <View style={styles.sheetActions}>
              <Button
                title="악보 올리기"
                variant="outline"
                loading={upload.isPending}
                onPress={() => {
                  void upload.mutateAsync().catch((e: Error) => {
                    Alert.alert('오류', e.message);
                  });
                }}
              />
              {sheets.length > 0 ? (
                <Button
                  title="마지막 장 삭제"
                  variant="outline"
                  loading={remove.isPending}
                  onPress={() => {
                    const last = sheets[sheets.length - 1];
                    if (!last) return;
                    Alert.alert('악보 삭제', '마지막 페이지를 삭제할까요?', [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: () =>
                          void remove.mutateAsync(last.id).catch((e: Error) => {
                            Alert.alert('오류', e.message);
                          }),
                      },
                    ]);
                  }}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.card }]}>
        <Button title="이 곡 콘티에 추가" onPress={onAddToSetlist} loading={addBusy} disabled={addBusy} />
      </View>

      <SongSheetViewer
        visible={viewerOpen}
        sheets={sheets}
        title={song.title}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyTitle: { ...typeface.sansMedium, fontSize: fontSize.base, marginTop: 8 },
  emptySub: { ...typeface.sans, fontSize: fontSize.sm, textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: { flex: 1 },
  songTitle: { ...typeface.serifBold, fontSize: fontSize.lg },
  artist: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4 },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  noLyrics: { ...typeface.sans, fontSize: fontSize.sm },
  verseBlock: { marginBottom: 18 },
  verseLabel: { ...typeface.mono, fontSize: fontSize.xs, letterSpacing: 1, marginBottom: 6 },
  line: { ...typeface.serif, fontSize: fontSize.md, lineHeight: fontSize.md * 1.9 },
  sheetPane: { flex: 1 },
  sheetThumb: { width: 280, height: 360, margin: 12 },
  sheetImg: { width: '100%', height: '100%' },
  sheetActions: { padding: 12, gap: 8 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
