import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TranscribeWorshipPickRow } from '@/components/transcribe/TranscribeWorshipPickRow';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranscriptionCountsByWorship } from '@/hooks/useTranscription';
import { useWorships } from '@/hooks/useWorships';
import { useThemeStore } from '@/stores/themeStore';
import { useUserStore } from '@/stores/userStore';

export default function TranscribeHomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const toggleDark = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);

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

  const { data: worships, isLoading, isRefetching, refetch: refetchWorships } = useWorships();
  const list = worships ?? [];

  const countsQuery = useTranscriptionCountsByWorship();
  const counts = countsQuery.data ?? {};

  const onRefresh = useCallback(async () => {
    await refetchWorships();
    await countsQuery.refetch();
  }, [countsQuery, refetchWorships]);

  const listLoading = isLoading || (!!deviceId && countsQuery.isLoading);

  const openWorship = useCallback((worshipId: string) => {
    router.push({
      pathname: '/(tabs)/transcribe/[worshipId]',
      params: { worshipId },
    });
  }, []);

  const countFor = useMemo(() => (id: string) => counts[id] ?? 0, [counts]);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>필사</Text>
          <View style={styles.subRow}>
            <Feather name="refresh-cw" size={12} color={c.textSub} />
            <Text style={[styles.subtitle, { color: c.textSub }]}>
              예배를 골라 들어가면 날짜별 필사와 콘티로 이어져요
            </Text>
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
            refreshing={isRefetching || countsQuery.isRefetching}
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
        ) : (
          <>
            {role === 'leader' ? (
              <View style={[styles.leaderStrip, { borderColor: c.border, backgroundColor: c.card }]}>
                <Text style={[styles.leaderStripTitle, { color: c.text }]}>인도자</Text>
                
                {canCreateWorship ? (
                  <TouchableOpacity
                    style={[styles.leaderStripPrimary, { backgroundColor: c.accent }]}
                    onPress={() => router.push('/leader/worship/create' as Href)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="콘티 만들기"
                  >
                    <Feather name="plus-circle" size={20} color="#1a160e" />
                    <Text style={styles.leaderStripPrimaryText}>콘티 만들기</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.leaderStripMuted, { color: c.textSub }]}>
                    예배 등록은 이 모임의 모임장만 할 수 있어요. 콘티 편집은 내가 만든 예배에서 가능해요.
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.leaderStripSecondary, { borderColor: c.accent }]}
                  onPress={() => router.push('/leader/song/create' as Href)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="찬양 곡 추가"
                >
                  <Feather name="music" size={18} color={c.accent} />
                  <Text style={[styles.leaderStripSecondaryText, { color: c.accent }]}>찬양 곡 추가</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.hint, { color: c.textMid }]}>
              예배를 탭하면{' '}
              <Text style={{ ...typeface.sansMedium, color: c.text }}>그 예배 안에서 날짜별 필사 기록</Text>을 보고,
              콘티에서 새 필사를 시작할 수 있어요.
            </Text>

            {list.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={[styles.emptyTitle, { color: c.text }]}>등록된 예배가 없습니다</Text>
                {role === 'leader' && canCreateWorship ? (
                  <Text style={[styles.empty, { color: c.textSub, marginTop: 8 }]}>
                    위의 「새 예배 만들기」로 예배를 만든 뒤, 예배를 열어 콘티를 채워 주세요.
                  </Text>
                ) : role === 'leader' && !canCreateWorship ? (
                  <Text style={[styles.empty, { color: c.textSub, marginTop: 8 }]}>
                    모임장이 예배를 등록하면 여기에 표시됩니다.
                  </Text>
                ) : (
                  <Text style={[styles.empty, { color: c.textSub, marginTop: 8 }]}>
                    인도자에게 예배 등록을 요청해 주세요.
                  </Text>
                )}
              </View>
            ) : (
              list.map((w) => (
                <TranscribeWorshipPickRow
                  key={w.id}
                  worship={w}
                  transcriptionCount={countFor(w.id)}
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
    marginBottom: 16,
  },
  empty: { ...typeface.sans, fontSize: fontSize.base, textAlign: 'center', marginTop: 48 },
  emptyBlock: { marginTop: 12, paddingHorizontal: 4 },
  emptyTitle: { ...typeface.serifBold, fontSize: fontSize.lg, textAlign: 'center' },
  leaderStrip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  leaderStripTitle: { ...typeface.serifBold, fontSize: fontSize.md },
  leaderStripSub: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginTop: 6 },
  leaderStripPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaderStripPrimaryText: { ...typeface.sansMedium, fontSize: fontSize.md, color: '#1a160e' },
  leaderStripMuted: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginTop: 12 },
  leaderStripSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaderStripSecondaryText: { ...typeface.sansMedium, fontSize: fontSize.sm },
});
