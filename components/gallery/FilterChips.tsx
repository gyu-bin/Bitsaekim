import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

export type GalleryFilter = 'all' | 'mine' | string;

type Props = {
  worships: WorshipService[];
  active: GalleryFilter;
  onChange: (f: GalleryFilter) => void;
};

export function FilterChips({ worships, active, onChange }: Props) {
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
            backgroundColor: on ? c.accentLight : c.card,
            borderColor: on ? c.accent : c.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`필터 ${label}`}
      >
        <Text style={[styles.chipText, { color: on ? c.accentDark : c.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.hscroll}
      contentContainerStyle={styles.row}
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
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  chipText: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm },
});
