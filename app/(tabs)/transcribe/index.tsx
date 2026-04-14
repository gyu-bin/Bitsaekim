import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModeSelector } from '@/components/transcribe/ModeSelector';
import { TranscribeWorshipCard } from '@/components/transcribe/TranscribeWorshipCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useSetlistsByWorshipIds } from '@/hooks/useSetlist';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { useThemeStore } from '@/stores/themeStore';
import { useUserStore } from '@/stores/userStore';
import type { SetlistItem, TranscribeMode, WorshipService } from '@/types';

type PendingWrite = {
  worshipId: string;
  item: SetlistItem;
  songQueueIds: string[];
  fullQueue: boolean;
};

function songQueueFromItems(items: SetlistItem[]) {
  return items.filter((i) => !i.is_special && i.song_id).map((i) => i.song_id as string);
}

export default function TranscribeHomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const toggleDark = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);

  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringName = useUserStore((s) => s.gatheringName);
  const { data: worships, isLoading, isRefetching, refetch: refetchWorships } = useWorships();
  const list = worships ?? [];
  const worshipIds = useMemo(() => list.map((w) => w.id), [list]);
  const bulk = useSetlistsByWorshipIds(worshipIds);

  const [modeOpen, setModeOpen] = useState(false);
  const pendingRef = useRef<PendingWrite | null>(null);

  const byWorship = bulk.data ?? {};

  const onRefresh = useCallback(async () => {
    await refetchWorships();
    if (worshipIds.length > 0) await bulk.refetch();
  }, [bulk, refetchWorships, worshipIds.length]);

  const openModeFor = useCallback((payload: PendingWrite) => {
    pendingRef.current = payload;
    setModeOpen(true);
  }, []);

  const handleSongPress = useCallback(
    (worship: WorshipService, item: SetlistItem) => {
      const items = byWorship[worship.id] ?? [];
      const songQueueIds = songQueueFromItems(items);
      openModeFor({ worshipId: worship.id, item, songQueueIds, fullQueue: false });
    },
    [byWorship, openModeFor]
  );

  const handleStartFromBeginning = useCallback(
    (worship: WorshipService) => {
      const items = byWorship[worship.id] ?? [];
      const songQueueIds = songQueueFromItems(items);
      const first = items.find((i) => !i.is_special && i.song_id);
      if (!first?.song_id) return;
      openModeFor({ worshipId: worship.id, item: first, songQueueIds, fullQueue: true });
    },
    [byWorship, openModeFor]
  );

  const onPickMode = useCallback((mode: TranscribeMode) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p?.item.song_id) return;
    const queue =
      p.fullQueue && p.songQueueIds.length > 0 ? p.songQueueIds.join(',') : undefined;
    router.push({
      pathname: '/(tabs)/transcribe/write/[songId]',
      params: queue
        ? { songId: p.item.song_id, worshipId: p.worshipId, mode, queue }
        : { songId: p.item.song_id, worshipId: p.worshipId, mode },
    });
  }, []);

  const closeMode = useCallback(() => {
    setModeOpen(false);
    pendingRef.current = null;
  }, []);

  const listLoading = isLoading || (worshipIds.length > 0 && bulk.isLoading);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>필사</Text>
          <View style={styles.subRow}>
            <Feather name="refresh-cw" size={12} color={c.textSub} />
            <Text style={[styles.subtitle, { color: c.textSub }]}>아래로 당겨 최신 콘티를 불러오세요</Text>
          </View>
          {gatheringName ? (
            <Text style={[styles.gatheringLine, { color: c.textMid }]} numberOfLines={1}>
              모임 · {gatheringName}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={toggleDark}
          accessibilityRole="button"
          accessibilityLabel="다크 모드 전환"
        >
          <Feather name={isDark ? 'sun' : 'moon'} size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || bulk.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      >
        {listLoading ? (
          <LoadingSpinner />
        ) : !gatheringId ? (
          <Text style={[styles.empty, { color: c.textSub }]}>
            모임에 참여해야 예배 목록을 볼 수 있어요.
          </Text>
        ) : list.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSub }]}>
            이 모임에는 아직 예배가 없습니다. 인도자에게 문의해 주세요.
          </Text>
        ) : (
          <>
            <Text style={[styles.hint, { color: c.textMid }]}>
              예배마다 곡을 골라 필사하거나,{' '}
              <Text style={{ ...typeface.sansMedium, color: c.text }}>「처음 곡부터 순서대로」</Text>를 눌러
              콘티 순서대로 이어서 필사할 수 있어요.
            </Text>
            {list.map((w) => (
              <TranscribeWorshipCard
                key={w.id}
                worship={w}
                items={byWorship[w.id] ?? []}
                onSongPress={(item) => handleSongPress(w, item)}
                onStartFromBeginning={() => handleStartFromBeginning(w)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <ModeSelector visible={modeOpen} onClose={closeMode} onSelect={onPickMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { ...typeface.serifBold, fontSize: 28 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  subtitle: { ...typeface.sans, fontSize: fontSize.xs },
  gatheringLine: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 6 },
  body: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 },
  hint: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginBottom: 18,
  },
  empty: { ...typeface.sans, fontSize: fontSize.base, textAlign: 'center', marginTop: 48 },
});
