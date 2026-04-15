import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

function formatServiceDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

type Props = {
  worship: WorshipService;
  transcriptionCount: number;
  onPress: () => void;
};

export function TranscribeWorshipPickRow({ worship, transcriptionCount, onPress }: Props) {
  const c = useThemeColors();
  const n = transcriptionCount;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${worship.name} 예배, 필사 ${n}곡`}
    >
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {worship.name}
        </Text>
      </View>
      <Feather name="chevron-right" size={22} color={c.textSub} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  body: { flex: 1, minWidth: 0 },
  title: { ...typeface.serifBold, fontSize: fontSize.md, lineHeight: 22 },
  meta: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 6 },
});
