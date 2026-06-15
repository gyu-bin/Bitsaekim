import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radius, shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

type Props = {
  worship: WorshipService;
  onPress: () => void;
};

export function TranscribeWorshipPickRow({ worship, onPress }: Props) {
  const c = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.row, shadow.sm, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${worship.name} 예배`}
    >
      <View style={[styles.accentBar, { backgroundColor: c.accent }]} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {worship.name}
        </Text>
      </View>
      <View style={[styles.chevronWrap, { backgroundColor: c.accentMuted }]}>
        <Feather name="chevron-right" size={18} color={c.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingRight: 14,
    paddingLeft: 0,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  body: { flex: 1, minWidth: 0, paddingLeft: 12 },
  title: { ...typeface.serifBold, fontSize: fontSize.md, lineHeight: 24 },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
