import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { fontSize, fonts } from '@/constants/fonts';
import { useCreatorName, useSetlistByWorship } from '@/hooks/useSetlist';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

type BoardProps = {
  worship: WorshipService | null;
};

export function ContiBoard({ worship }: BoardProps) {
  const c = useThemeColors();
  const { data: items, isLoading } = useSetlistByWorship(worship?.id);
  const { data: leaderName } = useCreatorName(worship?.creator_id);

  if (!worship) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.empty, { color: c.textSub }]}>예배를 선택해 주세요</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={{ color: c.textSub, fontFamily: fonts.sans }}>불러오는 중…</Text>
      </View>
    );
  }

  const songCount = items?.filter((i) => !i.is_special && i.song_id).length ?? 0;
  const hasItems = (items?.length ?? 0) > 0;

  if (!hasItems) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.empty, { color: c.textSub }]}>
          인도자가 아직 콘티를 올리지 않았습니다
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="콘티 상세 보기"
      activeOpacity={0.9}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/transcribe/[worshipId]/[setlistId]',
          params: { worshipId: worship.id, setlistId: worship.id },
        })
      }
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.emoji}>📋</Text>
          <View style={styles.meta}>
            <Text style={[styles.date, { color: c.textMid }]}>{formatDate(worship.service_date)}</Text>
            <Text style={[styles.leader, { color: c.textSub }]}>
              {leaderName ?? '인도자'} · {songCount}곡
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color={c.textSub} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  empty: { fontFamily: fonts.sans, fontSize: fontSize.base, textAlign: 'center' },
  card: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 22 },
  meta: { flex: 1 },
  date: { fontFamily: fonts.mono, fontSize: fontSize.sm },
  leader: { fontFamily: fonts.sans, fontSize: fontSize.sm, marginTop: 4 },
});
