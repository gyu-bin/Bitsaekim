import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SetlistItem } from '@/types';

type Props = {
  items: SetlistItem[];
  onSongPress: (item: SetlistItem) => void;
};

export function SetlistTimeline({ items, onSongPress }: Props) {
  const c = useThemeColors();

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        if (item.is_special) {
          return (
            <View key={item.id} style={styles.specialRow}>
              <Text style={[styles.specialIcon, { color: c.accent }]}>✦</Text>
              <Text style={[styles.specialText, { color: c.textMid }]}>
                {item.custom_label ?? '특별 항목'}
              </Text>
            </View>
          );
        }

        const song = item.song;
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${song?.title ?? '곡'} 필사`}
            style={[styles.item, { borderLeftColor: c.accent }]}
            onPress={() => onSongPress(item)}
          >
            <View style={[styles.badge, { borderColor: c.accent }]}>
              <Text style={[styles.badgeText, { color: c.accent }]}>{item.order_index + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: c.text }]}>{song?.title ?? '곡 정보 없음'}</Text>
              {!!song?.artist && (
                <Text style={[styles.artist, { color: c.textSub }]}>{song.artist}</Text>
              )}
              {!!item.leader_note && (
                <Text style={[styles.note, { color: c.textMid }]}>{item.leader_note}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    paddingLeft: 12,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typeface.mono, fontSize: fontSize.xs },
  body: { flex: 1 },
  title: { ...typeface.serif, fontSize: fontSize.md },
  artist: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 2 },
  note: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 6, fontStyle: 'italic' },
  specialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  specialIcon: { fontSize: fontSize.md },
  specialText: { ...typeface.serif, fontSize: fontSize.md, fontStyle: 'italic' },
});
