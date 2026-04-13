import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WorshipService } from '@/types';

type Props = {
  worships: WorshipService[];
  value: WorshipService | null;
  onChange: (w: WorshipService) => void;
};

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

export function WorshipDropdown({ worships, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const c = useThemeColors();
  const insets = useSafeAreaInsets();

  const label = value ? `${value.name}` : '예배 선택';

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="예배 선택"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.card }]}
      >
        <Text style={[styles.triggerText, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Feather name="chevron-down" size={20} color={c.textSub} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: c.card,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: c.text }]}>예배 선택</Text>
            <FlatList
              data={worships}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: c.border }]}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowTitle, { color: c.text }]}>{item.name}</Text>
                  <Text style={[styles.rowSub, { color: c.textSub }]}>
                    {formatDate(item.service_date)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: c.textSub }]}>
                  등록된 예배가 없습니다
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  triggerText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: fontSize.md, marginRight: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSize.lg,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontFamily: fonts.sansMedium, fontSize: fontSize.md },
  rowSub: { fontFamily: fonts.mono, fontSize: fontSize.xs, marginTop: 4 },
  empty: { padding: 24, textAlign: 'center', fontFamily: fonts.sans },
});
