import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { radius } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

export type GalleryFilter = 'all' | 'mine' | string;

type Props = {
  worships: WorshipService[];
  active: GalleryFilter;
  onChange: (f: GalleryFilter) => void;
  horizontalPadding?: number;
};

export function FilterChips({ worships, active, onChange, horizontalPadding = 20 }: Props) {
  const c = useThemeColors();

  const Chip = ({
    id,
    label,
  }: {
    id: GalleryFilter;
    label: string;
  }) => {
    const on = active === id;
    return (
      <TouchableOpacity
        onPress={() => onChange(id)}
        style={[
          styles.chip,
          {
            backgroundColor: on ? c.accentMuted : c.card,
            borderColor: on ? c.accent : c.border,
          },
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`필터 ${label}`}
      >
        <Text style={[styles.chipText, { color: on ? c.accentDark : c.textMid }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.hscroll}
      contentContainerStyle={[styles.row, { paddingHorizontal: horizontalPadding }]}
    >
      <Chip id="all" label="전체" />
      {worships.map((w) => (
        <Chip key={w.id} id={w.id} label={w.name} />
      ))}
      <Chip id="mine" label="내 필사" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hscroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    gap: 8,
    paddingTop: 2,
    paddingBottom: 12,
    paddingHorizontal: 0,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { ...typeface.sansMedium, fontSize: fontSize.sm },
});
