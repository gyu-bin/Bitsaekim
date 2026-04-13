import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModeSelector } from '@/components/transcribe/ModeSelector';
import { SetlistTimeline } from '@/components/transcribe/SetlistTimeline';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, fonts } from '@/constants/fonts';
import { useCreatorName, useSetlistByWorship } from '@/hooks/useSetlist';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import type { SetlistItem } from '@/types';
import type { TranscribeMode } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

export default function SetlistDetailScreen() {
  const { worshipId } = useLocalSearchParams<{ worshipId: string; setlistId: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeColors();
  const { data: items, isLoading } = useSetlistByWorship(worshipId);
  const { data: worships } = useWorships();
  const worship = useMemo(
    () => worships?.find((w) => w.id === worshipId),
    [worshipId, worships]
  );
  const { data: leaderName } = useCreatorName(worship?.creator_id);

  useLayoutEffect(() => {
    if (worship?.name) {
      navigation.setOptions({ title: worship.name });
    }
  }, [navigation, worship?.name]);

  const [modeOpen, setModeOpen] = useState(false);
  const [pending, setPending] = useState<SetlistItem | null>(null);

  const firstSongItem = useMemo(
    () => items?.find((i) => !i.is_special && i.song_id),
    [items]
  );

  const openWrite = (item: SetlistItem, mode: TranscribeMode) => {
    if (!item.song_id || !worshipId) return;
    router.push({
      pathname: '/(tabs)/transcribe/write/[songId]',
      params: { songId: item.song_id, worshipId, mode },
    });
  };

  const onPickMode = (mode: TranscribeMode) => {
    if (pending) openWrite(pending, mode);
    setPending(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading || !worship ? (
          <LoadingSpinner />
        ) : (
          <>
            <Text style={[styles.meta, { color: c.textSub }]}>
              {formatDate(worship.service_date)} · {leaderName ?? '인도자'}
            </Text>
            <SetlistTimeline
              items={items ?? []}
              onSongPress={(item) => {
                if (!item.song_id) return;
                setPending(item);
                setModeOpen(true);
              }}
            />
            {!!firstSongItem && (
              <Button
                title="처음부터 필사 시작"
                onPress={() => {
                  setPending(firstSongItem);
                  setModeOpen(true);
                }}
                containerStyle={{ marginTop: 24 }}
              />
            )}
          </>
        )}
      </ScrollView>

      <ModeSelector visible={modeOpen} onClose={() => setModeOpen(false)} onSelect={onPickMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  meta: { fontFamily: fonts.sans, fontSize: fontSize.sm, marginTop: 4, marginBottom: 20 },
});
