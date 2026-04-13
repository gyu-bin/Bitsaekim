import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
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
import type { TranscribeMode } from '@/types';

const STORAGE_KEY = 'bitsaekim_last_transcribe_mode';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: TranscribeMode) => void;
};

export function ModeSelector({ visible, onClose, onSelect }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [defaultMode, setDefaultMode] = useState<TranscribeMode>('typing');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'handwriting' || v === 'typing') setDefaultMode(v);
    });
  }, []);

  const pick = useCallback(
    async (mode: TranscribeMode) => {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
      onSelect(mode);
      onClose();
    },
    [onClose, onSelect]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: c.card, paddingBottom: insets.bottom + 20 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: c.text }]}>어떻게 필사할까요?</Text>
          <Text style={[styles.hint, { color: c.textSub }]}>
            마지막 선택: {defaultMode === 'typing' ? '타이핑' : '손글씨'}
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: c.border }]}
            onPress={() => pick('handwriting')}
            accessibilityRole="button"
            accessibilityLabel="손글씨 필사"
          >
            <Text style={styles.emoji}>✍️</Text>
            <View>
              <Text style={[styles.optTitle, { color: c.text }]}>손글씨</Text>
              <Text style={[styles.optSub, { color: c.textSub }]}>
                Apple Pencil로 직접 쓰기
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: c.border }]}
            onPress={() => pick('typing')}
            accessibilityRole="button"
            accessibilityLabel="타이핑 필사"
          >
            <Text style={styles.emoji}>⌨️</Text>
            <View>
              <Text style={[styles.optTitle, { color: c.text }]}>타이핑</Text>
              <Text style={[styles.optSub, { color: c.textSub }]}>
                키보드로 따라 입력하기
              </Text>
            </View>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: { fontFamily: fonts.serifBold, fontSize: fontSize.lg },
  hint: { fontFamily: fonts.sans, fontSize: fontSize.sm, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emoji: { fontSize: 28 },
  optTitle: { fontFamily: fonts.sansMedium, fontSize: fontSize.md },
  optSub: { fontFamily: fonts.sans, fontSize: fontSize.sm, marginTop: 4 },
});
