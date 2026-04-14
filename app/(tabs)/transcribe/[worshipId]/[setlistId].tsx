import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TranscribeSongLauncher } from '@/components/transcribe/TranscribeSongLauncher';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useCreatorName, useSetlistByWorship } from '@/hooks/useSetlist';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

export default function SetlistDetailScreen() {
  const { worshipId } = useLocalSearchParams<{ worshipId: string; setlistId: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeColors();
  const {
    data: items,
    isLoading,
    isRefetching,
    refetch: refetchSetlist,
  } = useSetlistByWorship(worshipId);
  const { data: worships, refetch: refetchWorships, isRefetching: worshipRefetching } = useWorships();
  const worship = useMemo(
    () => worships?.find((w) => w.id === worshipId),
    [worshipId, worships]
  );
  const { data: leaderName } = useCreatorName(worship?.creator_id);

  const songQueueIds = useMemo(
    () => (items ?? []).filter((i) => !i.is_special && i.song_id).map((i) => i.song_id as string),
    [items]
  );

  const [manualRefresh, setManualRefresh] = useState(false);
  const onRefresh = useCallback(async () => {
    setManualRefresh(true);
    try {
      await Promise.all([refetchSetlist(), refetchWorships()]);
    } finally {
      setManualRefresh(false);
    }
  }, [refetchSetlist, refetchWorships]);

  useLayoutEffect(() => {
    if (worship?.name) {
      navigation.setOptions({ title: worship.name });
    }
  }, [navigation, worship?.name]);

  const refreshing = manualRefresh || isRefetching || worshipRefetching;

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      >
        {isLoading || !worship ? (
          <LoadingSpinner />
        ) : (
          <>
            <Text style={[styles.pullHint, { color: c.textSub }]}>
              아래로 당기면 인도자가 편집한 최신 콘티가 반영됩니다.
            </Text>
            <Text style={[styles.meta, { color: c.textSub }]}>
              {formatDate(worship.service_date)} · {leaderName ?? '인도자'}
            </Text>
            {!items?.length ? (
              <Text style={[styles.empty, { color: c.textSub }]}>
                아직 콘티에 곡이 없습니다. 잠시 후 다시 당겨 보세요.
              </Text>
            ) : (
              <TranscribeSongLauncher
                worshipId={worshipId!}
                items={items}
                songQueueIds={songQueueIds}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  pullHint: { ...typeface.sans, fontSize: fontSize.xs, marginBottom: 8, lineHeight: 18 },
  meta: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4, marginBottom: 20 },
  empty: { ...typeface.sans, fontSize: fontSize.sm, textAlign: 'center', marginTop: 24 },
});
