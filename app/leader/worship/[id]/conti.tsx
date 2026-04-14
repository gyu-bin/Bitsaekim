import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContiLyricsPreview } from '@/components/leader/ContiLyricsPreview';
import { SetlistEditor } from '@/components/leader/SetlistEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useLeaderSongFavorites, useToggleLeaderSongFavorite } from '@/hooks/useLeaderSongFavorites';
import { useSongsSearch } from '@/hooks/useSongs';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { SetlistItem, Song } from '@/types';

export default function ContiEditorScreen() {
  const { id: worshipId } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [searchInputKey, setSearchInputKey] = useState(0);
  const [preview, setPreview] = useState<Song | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(() => new Set());
  const [addingSong, setAddingSong] = useState(false);

  const { data: searchHits } = useSongsSearch(searchDebounced);
  const { data: favoriteIds } = useLeaderSongFavorites(deviceId);
  const toggleFavorite = useToggleLeaderSongFavorite();

  const onSearchChange = useCallback((text: string) => {
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => {
      searchDebounceTimer.current = null;
      setSearchDebounced(text);
    }, 280);
  }, []);

  const clearSearchInput = useCallback(() => {
    setSearchDebounced('');
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    setSearchInputKey((k) => k + 1);
  }, []);

  const { data: items, isLoading } = useQuery({
    queryKey: ['setlist', worshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setlist_items')
        .select('*, song:songs(*)')
        .eq('worship_id', worshipId!)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as SetlistItem[];
    },
    enabled: !!worshipId,
  });

  const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => a.order_index - b.order_index), [items]);

  const bumpSetlistCache = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['setlist', worshipId] });
    void qc.invalidateQueries({ queryKey: ['setlists-bulk'] });
  }, [qc, worshipId]);

  const persistOrder = useCallback(
    async (ordered: SetlistItem[]) => {
      if (!worshipId || !deviceId) return;
      const { error } = await supabase.rpc('setlist_reorder_for_leader', {
        p_worship_id: worshipId,
        p_device_id: deviceId,
        p_item_ids: ordered.map((row) => row.id),
      });
      if (error) {
        Alert.alert('오류', error.message ?? '순서를 저장하지 못했습니다.');
        return;
      }
      bumpSetlistCache();
    },
    [bumpSetlistCache, deviceId, worshipId]
  );

  const onDragEnd = (ordered: SetlistItem[]) => {
    void persistOrder(ordered);
  };

  const onNoteChange = async (itemId: string, note: string) => {
    if (!deviceId) return;
    const { error } = await supabase.rpc('setlist_item_note_for_leader', {
      p_item_id: itemId,
      p_device_id: deviceId,
      p_leader_note: note,
    });
    if (error) {
      Alert.alert('오류', error.message ?? '메모를 저장하지 못했습니다.');
      return;
    }
    bumpSetlistCache();
  };

  const addSong = useCallback(
    async (songId: string) => {
      if (!worshipId) return;
      if (!deviceId) {
        Alert.alert('알림', '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.');
        return;
      }
      setAddingSong(true);
      try {
        const { error } = await supabase.rpc('insert_setlist_song_for_leader', {
          p_worship_id: worshipId,
          p_song_id: songId,
          p_device_id: deviceId,
        });
        if (error) {
          Alert.alert('오류', error.message ?? '곡을 추가하지 못했습니다.');
          return;
        }
        bumpSetlistCache();
        clearSearchInput();
      } finally {
        setAddingSong(false);
      }
    },
    [bumpSetlistCache, clearSearchInput, deviceId, worshipId]
  );

  const toggleSongSelection = useCallback((songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }, []);

  const clearSongSelection = useCallback(() => {
    setSelectedSongIds(new Set());
  }, []);

  const q = searchDebounced.trim();
  const hits = (searchHits ?? []) as Song[];
  const displayHits = q.length > 0 ? hits : hits.slice(0, 40);

  const sortedHits = useMemo(() => {
    const fav = favoriteIds ?? new Set<string>();
    return [...displayHits].sort((a, b) => {
      const af = fav.has(a.id) ? 0 : 1;
      const bf = fav.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.title.localeCompare(b.title, 'ko');
    });
  }, [displayHits, favoriteIds]);

  const addSelectedSongs = useCallback(async () => {
    if (!worshipId || !deviceId) {
      Alert.alert('알림', '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.');
      return;
    }
    const alreadyIn = new Set(
      sorted.map((it) => it.song_id).filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    const idsInListOrder = sortedHits
      .filter((s) => selectedSongIds.has(s.id) && !alreadyIn.has(s.id))
      .map((s) => s.id);
    if (idsInListOrder.length === 0) {
      Alert.alert(
        '알림',
        selectedSongIds.size === 0
          ? '콘티에 넣을 곡을 목록에서 선택해 주세요.'
          : '선택한 곡은 이미 콘티에 있거나 추가할 곡이 없어요.'
      );
      return;
    }
    setAddingSong(true);
    try {
      for (const songId of idsInListOrder) {
        const { error } = await supabase.rpc('insert_setlist_song_for_leader', {
          p_worship_id: worshipId,
          p_song_id: songId,
          p_device_id: deviceId,
        });
        if (error) {
          Alert.alert('오류', error.message ?? '일부 곡을 추가하지 못했습니다.');
          bumpSetlistCache();
          return;
        }
      }
      bumpSetlistCache();
      clearSearchInput();
      clearSongSelection();
    } finally {
      setAddingSong(false);
    }
  }, [
    bumpSetlistCache,
    clearSearchInput,
    clearSongSelection,
    deviceId,
    selectedSongIds,
    sorted,
    sortedHits,
    worshipId,
  ]);

  const splitPreview = preview !== null;

  const onSelectSongRow = useCallback((s: Song) => {
    setPreview((cur) => (cur?.id === s.id ? null : s));
  }, []);

  const finishConti = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['leader-my-worships'] });
    router.back();
  }, [qc]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={finishConti}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, paddingHorizontal: 4 })}
          accessibilityLabel="콘티 편성 완료"
        >
          <Text style={[styles.headerDone, { color: c.accent }]}>완료</Text>
        </Pressable>
      ),
    });
  }, [c.accent, finishConti, navigation]);

  const onToggleFav = useCallback(
    async (songId: string) => {
      if (!deviceId) {
        Alert.alert('알림', '로그인(온보딩) 정보가 없습니다.');
        return;
      }
      try {
        await toggleFavorite.mutateAsync({ deviceId, songId });
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '즐겨찾기를 바꾸지 못했습니다.';
        Alert.alert('오류', msg);
      }
    },
    [deviceId, toggleFavorite]
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.searchBlock, { borderBottomColor: c.border }]}>
        <Text style={[styles.sectionLabel, { color: c.textSub }]}>곡 검색</Text>
        <Input
          key={searchInputKey}
          defaultValue=""
          onChangeText={onSearchChange}
          placeholder="제목으로 검색…"
          accessibilityLabel="곡 검색"
          style={styles.searchInput}
        />
      </View>

      <View style={[styles.splitRow, { borderBottomColor: c.border }]}>
        <View
          style={[
            styles.colList,
            {
              borderRightWidth: splitPreview ? StyleSheet.hairlineWidth : 0,
              borderRightColor: c.border,
            },
          ]}
        >
          <View style={styles.listHeaderRow}>
            <Text style={[styles.colTitle, { color: c.textSub, marginBottom: 0 }]}>목록</Text>
            {selectedSongIds.size > 0 ? (
              <View style={styles.selectionActions}>
                <Text style={[styles.selectionCount, { color: c.textSub }]}>
                  {selectedSongIds.size}곡 선택
                </Text>
                <Pressable
                  onPress={clearSongSelection}
                  hitSlop={8}
                  accessibilityLabel="선택 해제"
                >
                  <Text style={[styles.selectionClear, { color: c.accent }]}>해제</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {selectedSongIds.size > 0 ? (
            <View style={styles.bulkAddRow}>
              <Button
                title={`선택 곡 콘티에 추가 (${selectedSongIds.size})`}
                onPress={() => void addSelectedSongs()}
                loading={addingSong}
                disabled={addingSong}
                containerStyle={styles.bulkAddBtn}
              />
            </View>
          ) : null}
          <FlatList
            data={sortedHits}
            keyExtractor={(s) => s.id}
            style={styles.songList}
            contentContainerStyle={styles.songListContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyList, { color: c.textSub }]}>
                {q ? '검색 결과가 없습니다.' : '등록된 찬양이 없습니다.'}
              </Text>
            }
            renderItem={({ item: s }) => {
              const previewOn = preview?.id === s.id;
              const checked = selectedSongIds.has(s.id);
              const isFav = favoriteIds?.has(s.id) ?? false;
              return (
                <View
                  style={[
                    styles.hitRow,
                    {
                      borderColor: previewOn || checked ? c.accent : c.border,
                      backgroundColor: previewOn || checked ? c.accentLight : c.card,
                    },
                  ]}
                >
                  <Pressable
                    style={styles.hitCheck}
                    onPress={() => toggleSongSelection(s.id)}
                    hitSlop={6}
                    accessibilityLabel={checked ? '선택 해제' : '선택'}
                    accessibilityState={{ checked }}
                  >
                    <Feather
                      name={checked ? 'check-square' : 'square'}
                      size={22}
                      color={checked ? c.accent : c.textSub}
                    />
                  </Pressable>
                  <Pressable style={styles.hitMain} onPress={() => onSelectSongRow(s)}>
                    <Text style={{ color: c.text, ...typeface.sansMedium }} numberOfLines={2}>
                      {s.title}
                    </Text>
                    {!!s.artist && (
                      <Text style={{ color: c.textSub, fontSize: fontSize.sm }} numberOfLines={1}>
                        {s.artist}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.hitFav}
                    onPress={() => void onToggleFav(s.id)}
                    hitSlop={8}
                    accessibilityLabel="즐겨찾기"
                  >
                    <Feather name="heart" size={20} color={isFav ? '#c45c48' : c.textSub} />
                  </Pressable>
                </View>
              );
            }}
          />
        </View>

        {splitPreview && preview ? (
          <View style={styles.colLyrics}>
            <Text style={[styles.colTitle, { color: c.textSub }]}>가사</Text>
            <ContiLyricsPreview
              song={preview}
              onAddToSetlist={() => {
                void addSong(preview.id);
              }}
              isFavorite={favoriteIds?.has(preview.id) ?? false}
              onToggleFavorite={() => {
                void onToggleFav(preview.id);
              }}
              favoriteBusy={toggleFavorite.isPending}
              addBusy={addingSong}
              onPressTitle={() => setPreview(null)}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.setlistBlock, { borderTopColor: c.border }]}>
        <Text style={[styles.sectionLabel, { color: c.textSub, paddingHorizontal: 16, marginBottom: 8 }]}>
          이번 예배 콘티
        </Text>
        <View style={styles.setlistInner}>
          <SetlistEditor
            items={sorted}
            onDragEnd={onDragEnd}
            onNoteChange={(itemId, note) => void onNoteChange(itemId, note)}
          />
        </View>
      </View>

      <View
        style={[
          styles.doneBar,
          {
            borderTopColor: c.border,
            backgroundColor: c.background,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Button title="콘티 편성 완료" onPress={finishConti} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerDone: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    marginBottom: 8,
  },
  searchInput: { minHeight: 48 },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colList: {
    flex: 1,
    minWidth: 0,
    paddingTop: 8,
  },
  colLyrics: {
    flex: 1,
    minWidth: 0,
    paddingTop: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectionCount: {
    ...typeface.sans,
    fontSize: fontSize.xs,
  },
  selectionClear: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
  },
  bulkAddRow: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  bulkAddBtn: { minHeight: 44 },
  colTitle: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  colHint: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    paddingHorizontal: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  songList: { flex: 1 },
  songListContent: { paddingHorizontal: 10, paddingBottom: 12, gap: 6 },
  emptyList: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hitCheck: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitMain: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 4,
    minWidth: 0,
  },
  hitFav: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setlistBlock: {
    flex: 1,
    minHeight: 0,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  setlistInner: { flex: 1, paddingHorizontal: 16, minHeight: 0 },
  doneBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
