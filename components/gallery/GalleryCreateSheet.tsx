import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GalleryCreateSheet({ visible, onClose }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();

  const go = (path: '/(tabs)/gallery/compose' | '/(tabs)/gallery/share-chant') => {
    onClose();
    router.push(path);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.card, shadow.md, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[styles.title, { color: c.text }]}>나눔 올리기</Text>
          <Text style={[styles.sub, { color: c.textSub }]}>어떤 형태로 올릴까요?</Text>

          <Pressable
            style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => go('/(tabs)/gallery/compose')}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.accentMuted }]}>
              <Feather name="image" size={22} color={c.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: c.text }]}>사진·필사 캡처</Text>
              <Text style={[styles.rowDesc, { color: c.textSub }]}>손글씨·화면 캡처·노트 사진</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.textSub} />
          </Pressable>

          <Pressable
            style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => go('/(tabs)/gallery/share-chant')}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.accentMuted }]}>
              <Feather name="music" size={22} color={c.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: c.text }]}>찬양·링크·묵상</Text>
              <Text style={[styles.rowDesc, { color: c.textSub }]}>유튜브·가사·느낀 점 나눔</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.textSub} />
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: c.textSub }]}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    ...typeface.sansMedium,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  sub: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
  rowDesc: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
});
