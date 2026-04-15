import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useSetlistsByWorshipIds } from '@/hooks/useSetlist';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { useUserStore } from '@/stores/userStore';
import type { SetlistItem, WorshipService } from '@/types';

function formatServiceDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

function normalizeWorshipTitle(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function songCount(items: SetlistItem[]) {
  return items.filter((i) => !i.is_special && i.song_id).length;
}

function specialCount(items: SetlistItem[]) {
  return items.filter((i) => i.is_special).length;
}

export default function TranscribeWorshipHubScreen() {
  const { worshipId } = useLocalSearchParams<{ worshipId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const deviceId = useUserStore((s) => s.deviceId);
  const role = useUserStore((s) => s.role);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const isGatheringOwner = !!(
    deviceId &&
    gatheringOwnerDeviceId &&
    deviceId === gatheringOwnerDeviceId
  );

  const {
    data: worships,
    isLoading: worshipsLoading,
    refetch: refetchWorships,
    isRefetching: worshipRefetching,
  } = useWorships();

  const base = useMemo(
    () => worships?.find((w) => w.id === worshipId),
    [worships, worshipId]
  );

  const series = useMemo(() => {
    if (!base || !worships?.length) return [] as WorshipService[];
    const key = normalizeWorshipTitle(base.name);
    return worships
      .filter((w) => normalizeWorshipTitle(w.name) === key)
      .sort((a, b) => b.service_date.localeCompare(a.service_date));
  }, [base, worships]);

  const seriesIds = useMemo(() => series.map((w) => w.id), [series]);
  const setlistsQuery = useSetlistsByWorshipIds(seriesIds);
  const byWorship = setlistsQuery.data ?? {};

  const canEditConti = useCallback(
    (w: WorshipService) =>
      role === 'leader' && !!deviceId && (isGatheringOwner || w.creator_id === deviceId),
    [role, deviceId, isGatheringOwner]
  );

  const onRefresh = useCallback(async () => {
    await refetchWorships();
    if (seriesIds.length > 0) await setlistsQuery.refetch();
  }, [refetchWorships, seriesIds.length, setlistsQuery]);

  useLayoutEffect(() => {
    if (base?.name) {
      navigation.setOptions({ title: base.name });
    }
  }, [navigation, base?.name]);

  const openSetlistFor = (id: string) => {
    router.push({
      pathname: '/(tabs)/transcribe/[worshipId]/[setlistId]',
      params: { worshipId: id, setlistId: id },
    });
  };

  const openContiEditorFor = (id: string) => {
    router.push(`/leader/worship/${id}/conti` as Href);
  };

  const refreshing = worshipRefetching || setlistsQuery.isRefetching;

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom }]}>
      {worshipsLoading ? (
        <LoadingSpinner />
      ) : !base ? (
        <Text style={[styles.fallback, { color: c.textSub }]}>예배를 찾을 수 없어요.</Text>
      ) : (
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
          <Text style={[styles.hint, { color: c.textMid }]}>
            같은 이름으로 올라온 예배를 <Text style={{ ...typeface.sansMedium, color: c.text }}>예배일 순</Text>으로
            모았어요. 날짜를 누르면 그날 콘티에서 필사할 수 있어요.
          </Text>
          {series.length > 1 ? (
            <Text style={[styles.seriesMeta, { color: c.textSub }]}>
              {series.length}회 분량 · 최신 날짜가 위에 있어요
            </Text>
          ) : null}

          {series.map((w) => {
            const items = byWorship[w.id] ?? [];
            const songs = songCount(items);
            const specials = specialCount(items);
            const edit = canEditConti(w);
            return (
              <View
                key={w.id}
                style={[styles.seriesRow, { borderColor: c.border, backgroundColor: c.card }]}
              >
                <TouchableOpacity
                  style={styles.seriesRowMain}
                  onPress={() => openSetlistFor(w.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatServiceDate(w.service_date)} 콘티에서 필사`}
                >
                  <View style={styles.seriesRowText}>
                    <Text style={[styles.seriesDate, { color: c.text }]}>
                      {formatServiceDate(w.service_date)}
                    </Text>
                    <Text style={[styles.seriesSub, { color: c.textSub }]}>
                      {songs > 0
                        ? `곡 ${songs}${specials > 0 ? ` · 특별 ${specials}` : ''}`
                        : '콘티에 곡이 없어요'}
                    </Text>
                  </View>
                  <View style={styles.seriesRowRight}>
                    <Text style={[styles.seriesCta, { color: c.accent }]}>필사</Text>
                    <Feather name="chevron-right" size={20} color={c.textSub} />
                  </View>
                </TouchableOpacity>
                {edit ? (
                  <TouchableOpacity
                    style={[styles.seriesEditBtn, { borderTopColor: c.border }]}
                    onPress={() => openContiEditorFor(w.id)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatServiceDate(w.service_date)} 콘티 편집`}
                  >
                    <Feather name="edit-3" size={16} color={c.accent} />
                    <Text style={[styles.seriesEditLabel, { color: c.accent }]}>콘티 편집</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  fallback: { ...typeface.sans, fontSize: fontSize.md, textAlign: 'center', marginTop: 48 },
  hint: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 22, marginBottom: 8 },
  seriesMeta: { ...typeface.sans, fontSize: fontSize.xs, marginBottom: 16 },
  sectionTitle: { ...typeface.serifBold, fontSize: fontSize.lg, marginBottom: 12 },
  seriesRow: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  seriesRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  seriesRowText: { flex: 1, minWidth: 0, paddingRight: 8 },
  seriesDate: { ...typeface.serifBold, fontSize: fontSize.md },
  seriesSub: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4 },
  seriesRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seriesCta: { ...typeface.sansMedium, fontSize: fontSize.sm },
  seriesEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seriesEditLabel: { ...typeface.sansMedium, fontSize: fontSize.xs },
});
