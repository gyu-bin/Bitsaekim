import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContiBoard } from '@/components/transcribe/ContiBoard';
import { WorshipDropdown } from '@/components/transcribe/WorshipDropdown';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { useThemeStore } from '@/stores/themeStore';
import type { WorshipService } from '@/types';

export default function TranscribeHomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const toggleDark = useThemeStore((s) => s.toggle);
  const { data: worships, isLoading } = useWorships();
  const [selected, setSelected] = useState<WorshipService | null>(null);

  const list = worships ?? [];
  const effective = useMemo(() => {
    if (selected) return selected;
    return list[0] ?? null;
  }, [list, selected]);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>필사</Text>
        <TouchableOpacity
          onPress={toggleDark}
          accessibilityRole="button"
          accessibilityLabel="다크 모드 전환"
        >
          <Feather name="moon" size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {isLoading ? (
          <LoadingSpinner />
        ) : list.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSub }]}>
            아직 예배가 없습니다. 인도자에게 문의해 주세요.
          </Text>
        ) : (
          <>
            <WorshipDropdown worships={list} value={effective} onChange={setSelected} />
            <ContiBoard worship={effective} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontFamily: fonts.serifBold, fontSize: 28 },
  body: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: { fontFamily: fonts.sans, fontSize: fontSize.base, textAlign: 'center', marginTop: 48 },
});
