import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ModeSelector } from '@/components/transcribe/ModeSelector';
import { TranscribeWorshipPickRow } from '@/components/transcribe/TranscribeWorshipPickRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useSongsSearch } from '@/hooks/useSongs';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { isSupabaseConfigured, supabaseMissingConfigUserMessage } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { Song, TranscribeMode } from '@/types';

export default function TranscribeHomeScreen() {
  const { horizontalGutter, insets, listBottomPadding } = useLayoutMetrics();
  const c = useThemeColors();

  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringName = useUserStore((s) => s.gatheringName);
  const deviceId = useUserStore((s) => s.deviceId);
  const role = useUserStore((s) => s.role);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const isGatheringOwner = !!(
    deviceId &&
    gatheringOwnerDeviceId &&
    deviceId === gatheringOwnerDeviceId
  );
  const gatheringOwnerKnown = gatheringId != null && gatheringOwnerDeviceId != null;
  const isNonOwnerLeader =
    role === 'leader' && !!gatheringId && gatheringOwnerKnown && !isGatheringOwner;
  const canCreateWorship = role === 'leader' && !isNonOwnerLeader;

  const {
    data: worships,
    isError: worshipsError,
    isLoading: worshipsLoading,
    refetch: refetchWorships,
  } = useWorships();
  const list = worships ?? [];

  const [songQuery, setSongQuery] = useState('');
  const songsQuery = useSongsSearch(songQuery);
  const songList: Song[] = songsQuery.data ?? [];
  const songsLoading = songsQuery.isLoading;
  const refetchSongs = songsQuery.refetch;
  const [pendingSong, setPendingSong] = useState<Song | null>(null);
  const [modeOpen, setModeOpen] = useState(false);

  const [manualRefresh, setManualRefresh] = useState(false);
  const onRefresh = useCallback(async () => {
    setManualRefresh(true);
    try {
      await Promise.all([refetchWorships(), refetchSongs()]);
    } finally {
      setManualRefresh(false);
    }
  }, [refetchWorships, refetchSongs]);

  const showInitialLoader = !!gatheringId && worshipsLoading;

  const openWorship = useCallback((worshipId: string) => {
    router.push({
      pathname: '/(tabs)/transcribe/[worshipId]',
      params: { worshipId },
    });
  }, []);

  const openSoloWrite = useCallback((song: Song, mode: TranscribeMode) => {
    router.push({
      pathname: '/(tabs)/transcribe/write/[songId]',
      params: { songId: song.id, mode },
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: horizontalGutter }}>
        <ScreenHeader
          title="필사"
          badge={gatheringName?.trim() || (gatheringId ? '모임' : '혼자')}
          subtitle={
            gatheringId
              ? '예배를 고르거나, 아래에서 곡을 골라 필사하세요'
              : '곡을 골라 바로 필사할 수 있어요'
          }
          showThemeToggle
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: horizontalGutter, paddingBottom: listBottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={manualRefresh}
            onRefresh={() => void onRefresh()}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {!isSupabaseConfigured() ? (
          <EmptyState
            icon="alert-circle"
            title="서버 연결 설정이 필요해요"
            description={supabaseMissingConfigUserMessage()}
          />
        ) : (
          <>
            {!gatheringId ? (
              <View style={[styles.soloBanner, { backgroundColor: c.surface }]}>
                <Text style={[styles.soloBannerText, { color: c.textMid }]}>
                  혼자 쓰는 중이에요. 모임에 들어가면 예배 콘티도 함께 볼 수 있어요.
                </Text>
                <Button
                  title="모임 참여"
                  variant="outline"
                  onPress={() => router.push('/join-gathering' as Href)}
                  containerStyle={{ marginTop: 12 }}
                />
              </View>
            ) : null}

            {gatheringId ? (
              <>
                {showInitialLoader ? (
                  <LoadingSpinner />
                ) : worshipsError ? (
                  <EmptyState
                    icon="alert-circle"
                    title="예배 목록을 불러오지 못했어요"
                    description="아래로 당겨 다시 시도해 주세요."
                  />
                ) : (
                  <>
                    {role === 'leader' ? (
                      <Card style={styles.leaderStrip}>
                        <View style={[styles.leaderStripAccent, { backgroundColor: c.accent }]} />
                        <Text style={[styles.leaderStripTitle, { color: c.text }]}>인도자</Text>

                        {canCreateWorship ? (
                          <Button
                            title="콘티 만들기"
                            onPress={() => router.push('/leader/worship/create' as Href)}
                            accessibilityLabel="콘티 만들기"
                            containerStyle={styles.leaderStripPrimaryBtn}
                          />
                        ) : (
                          <Text style={[styles.leaderStripMuted, { color: c.textSub }]}>
                            예배 등록은 이 모임의 모임장만 할 수 있어요. 콘티 편집은 내가 만든 예배에서
                            가능해요.
                          </Text>
                        )}
                        <Button
                          title="찬양 곡 추가"
                          variant="outline"
                          onPress={() => router.push('/leader/song/create' as Href)}
                          accessibilityLabel="찬양 곡 추가"
                          containerStyle={styles.leaderStripSecondaryBtn}
                        />
                      </Card>
                    ) : null}

                    <Text style={[styles.sectionTitle, { color: c.text }]}>예배 콘티</Text>
                    <Text style={[styles.hint, { color: c.textMid }]}>
                      예배를 탭하면 날짜별 필사 기록을 보고, 콘티에서 새 필사를 시작할 수 있어요.
                    </Text>

                    {list.length === 0 ? (
                      <EmptyState
                        icon="calendar"
                        title="등록된 예배가 없습니다"
                        description={
                          role === 'leader' && canCreateWorship
                            ? '위의 「콘티 만들기」로 예배를 만든 뒤, 예배를 열어 콘티를 채워 주세요.'
                            : role === 'leader' && !canCreateWorship
                              ? '모임장이 예배를 등록하면 여기에 표시됩니다.'
                              : '인도자에게 예배 등록을 요청해 주세요.'
                        }
                      />
                    ) : (
                      list.map((w) => (
                        <TranscribeWorshipPickRow
                          key={w.id}
                          worship={w}
                          onPress={() => openWorship(w.id)}
                        />
                      ))
                    )}
                  </>
                )}
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: c.text, marginTop: gatheringId ? 28 : 8 }]}>
              곡으로 필사
            </Text>
            <TextInput
              value={songQuery}
              onChangeText={setSongQuery}
              placeholder="곡 제목·아티스트 검색"
              placeholderTextColor={c.textSub}
              style={[
                styles.search,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.card,
                },
              ]}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            {songsLoading && songList.length === 0 ? (
              <LoadingSpinner />
            ) : songList.length === 0 ? (
              <EmptyState
                icon="music"
                title="곡이 없어요"
                description="검색어를 바꾸거나, 인도자가 곡을 추가하면 여기에 나타나요."
              />
            ) : (
              songList.map((song) => (
                <Pressable
                  key={song.id}
                  onPress={() => {
                    setPendingSong(song);
                    setModeOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.songRow,
                    { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${song.title} 필사`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songTitle, { color: c.text }]} numberOfLines={1}>
                      {song.title}
                    </Text>
                    {song.artist ? (
                      <Text style={[styles.songArtist, { color: c.textSub }]} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>

      <ModeSelector
        visible={modeOpen}
        onClose={() => {
          setModeOpen(false);
          setPendingSong(null);
        }}
        onSelect={(mode) => {
          const song = pendingSong;
          setModeOpen(false);
          setPendingSong(null);
          if (song) openSoloWrite(song, mode);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flexGrow: 1 },
  soloBanner: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  soloBannerText: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20 },
  sectionTitle: { ...typeface.sansMedium, fontSize: fontSize.base, marginBottom: 8 },
  hint: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginBottom: 16,
  },
  search: {
    ...typeface.sans,
    fontSize: fontSize.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  songRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  songTitle: { ...typeface.sansMedium, fontSize: fontSize.base },
  songArtist: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 2 },
  leaderStrip: {
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  leaderStripAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  leaderStripTitle: { ...typeface.serifBold, fontSize: fontSize.lg, marginTop: 4 },
  leaderStripPrimaryBtn: { marginTop: 14 },
  leaderStripMuted: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginTop: 12 },
  leaderStripSecondaryBtn: { marginTop: 10 },
});
