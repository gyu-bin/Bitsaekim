import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radius } from '@/constants/colors';
import { typography } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

type Props = {
  worship: WorshipService;
  onPress: () => void;
};

export function TranscribeWorshipPickRow({ worship, onPress }: Props) {
  const c = useThemeColors();
  const [y, m, d] = worship.service_date.split('-');
  const dateLabel = `${y}.${m}.${d}`;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${worship.name} 예배`}
    >
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {worship.name}
        </Text>
        <Text style={[styles.sub, { color: c.textSub }]}>{dateLabel}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.textSub} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  body: { flex: 1, minWidth: 0 },
  title: { ...typography.cardTitle },
  sub: { ...typography.chip, fontSize: 12, marginTop: 4 },
});
