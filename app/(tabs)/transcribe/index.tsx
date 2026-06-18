import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TranscribeWorshipPickRow } from '@/components/transcribe/TranscribeWorshipPickRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { isSupabaseConfigured, supabaseMissingConfigUserMessage } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

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

  const [manualRefresh, setManualRefresh] = useState(false);
  const onRefresh = useCallback(async () => {
    setManualRefresh(true);
    try {
      await refetchWorships();
    } finally {
      setManualRefresh(false);
    }
  }, [refetchWorships]);

  const showInitialLoader = !!gatheringId && worshipsLoading;

  const openWorship = useCallback((worshipId: string) => {
    router.push({
      pathname: '/(tabs)/transcribe/[worshipId]',
      params: { worshipId },
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: horizontalGutter }}>
        <ScreenHeader
          title="필사"
          badge={gatheringName?.trim() || '모임'}
          subtitle="예배를 골라 날짜별 기록을 이어가세요"
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
      >
        {!isSupabaseConfigured() ? (
          <EmptyState
            icon="alert-circle"
            title="서버 연결 설정이 필요해요"
            description={supabaseMissingConfigUserMessage()}
          />
        ) : showInitialLoader ? (
          <LoadingSpinner />
        ) : worshipsError ? (
          <EmptyState
            icon="alert-circle"
            title="예배 목록을 불러오지 못했어요"
            description="아래로 당겨 다시 시도해 주세요."
          />
        ) : !gatheringId ? (
          <EmptyState
            icon="users"
            title="모임에 참여해 주세요"
            description="모임에 참여해야 예배 목록을 볼 수 있어요."
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
                    예배 등록은 이 모임의 모임장만 할 수 있어요. 콘티 편집은 내가 만든 예배에서 가능해요.
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

            <Text style={[styles.hint, { color: c.textMid }]}>
              예배를 탭하면{' '}
              <Text style={{ ...typeface.sansMedium, color: c.text }}>그 예배 안에서 날짜별 필사 기록</Text>을 보고,
              콘티에서 새 필사를 시작할 수 있어요.
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flexGrow: 1 },
  hint: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginBottom: 16,
  },
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
