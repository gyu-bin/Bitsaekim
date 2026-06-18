import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { radius } from '@/constants/colors';
import { typography, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { GalleryFilter } from '@/lib/galleryFilter';
import type { WorshipService } from '@/types';

export type { GalleryFilter };

type Props = {
  worships: WorshipService[];
  active: GalleryFilter;
  onChange: (f: GalleryFilter) => void;
  horizontalPadding?: number;
};

export function FilterChips({ worships, active, onChange, horizontalPadding = 20 }: Props) {
  const c = useThemeColors();

  const Chip = ({ id, label }: { id: GalleryFilter; label: string }) => {
    const on = active === id;
    return (
      <TouchableOpacity
        onPress={() => {
          void Haptics.selectionAsync();
          onChange(id);
        }}
        style={[
          styles.chip,
          {
            backgroundColor: c.chip,
            borderColor: on ? c.text : c.border,
          },
        ]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`필터 ${label}`}
      >
        <Text
          style={[
            styles.chipText,
            { color: on ? c.text : c.textSub },
            on && styles.chipTextActive,
          ]}
        >
          {label}
        </Text>
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
      <Chip id="week" label="이번 주" />
      <Chip id="month" label="이번 달" />
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
    gap: 8,
    paddingTop: 2,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { ...typography.chip },
  chipTextActive: { ...typography.chip, ...typeface.sansMedium },
});
