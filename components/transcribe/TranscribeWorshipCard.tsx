import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SetlistItem, WorshipService } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

type Props = {
  worship: WorshipService;
  items: SetlistItem[];
  onSongPress: (item: SetlistItem) => void;
  onStartFromBeginning: () => void;
};

export function TranscribeWorshipCard({ worship, items, onSongPress, onStartFromBeginning }: Props) {
  const c = useThemeColors();
  const songs = items.filter((i) => !i.is_special && i.song_id);
  const specials = items.filter((i) => i.is_special);

  const openTimeline = () => {
    router.push({
      pathname: '/(tabs)/transcribe/[worshipId]/[setlistId]',
      params: { worshipId: worship.id, setlistId: worship.id },
    });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
            {worship.name}
          </Text>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={14} color={c.textSub} />
            <Text style={[styles.date, { color: c.textSub }]}>{formatDate(worship.service_date)}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={openTimeline}
          style={[styles.timelineBtn, { borderColor: c.border }]}
          hitSlop={8}
          accessibilityLabel="콘티 타임라인으로"
        >
          <Feather name="list" size={18} color={c.accent} />
        </TouchableOpacity>
      </View>

      {songs.length === 0 && specials.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSub }]}>아직 등록된 곡이 없습니다.</Text>
      ) : (
        <>
          {specials.length > 0 ? (
            <View style={[styles.specialBanner, { backgroundColor: c.accentLight }]}>
              <Text style={[styles.specialTxt, { color: c.textMid }]}>
                특별 항목 {specials.length} · 곡은 아래에서 선택
              </Text>
            </View>
          ) : null}
          <Text style={[styles.sectionLabel, { color: c.textSub }]}>곡 선택</Text>
          <View style={styles.songList}>
            {songs.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.songRow, { borderColor: c.border }]}
                onPress={() => onSongPress(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${item.song?.title ?? '곡'} 필사`}
              >
                <View style={[styles.orderBadge, { borderColor: c.accent }]}>
                  <Text style={[styles.orderTxt, { color: c.accent }]}>{item.order_index + 1}</Text>
                </View>
                <View style={styles.songBody}>
                  <Text style={[styles.songTitle, { color: c.text }]} numberOfLines={2}>
                    {item.song?.title ?? '곡 정보 없음'}
                  </Text>
                  {!!item.song?.artist && (
                    <Text style={[styles.artist, { color: c.textSub }]} numberOfLines={1}>
                      {item.song.artist}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={20} color={c.textSub} />
              </TouchableOpacity>
            ))}
          </View>
          {songs.length > 0 ? (
            <Button
              title="처음 곡부터 순서대로 필사"
              variant="outline"
              onPress={onStartFromBeginning}
              containerStyle={styles.fromStartBtn}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  headText: { flex: 1, minWidth: 0 },
  name: { ...typeface.serifBold, fontSize: fontSize.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  date: { ...typeface.mono, fontSize: fontSize.xs },
  timelineBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4 },
  specialBanner: { borderRadius: 10, padding: 10, marginBottom: 12 },
  specialTxt: { ...typeface.sans, fontSize: fontSize.xs },
  sectionLabel: { ...typeface.sansMedium, fontSize: fontSize.xs, marginBottom: 8, letterSpacing: 0.3 },
  songList: { gap: 8 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTxt: { ...typeface.mono, fontSize: fontSize.xs },
  songBody: { flex: 1, minWidth: 0 },
  songTitle: { ...typeface.sansMedium, fontSize: fontSize.sm },
  artist: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 2 },
  fromStartBtn: { marginTop: 14 },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  footerLinkText: { ...typeface.sansMedium, fontSize: fontSize.xs },
});
