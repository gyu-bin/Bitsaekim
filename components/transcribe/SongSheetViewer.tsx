import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SongSheet } from '@/lib/songSheets';

type Props = {
  sheets: SongSheet[];
  visible: boolean;
  onClose: () => void;
  title?: string;
};

function ZoomablePage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(1, saved.value * e.scale));
    })
    .onEnd(() => {
      saved.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        saved.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (saved.value <= 1.05) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <Animated.View style={[styles.zoomWrap, style]}>
        <Image source={{ uri }} style={styles.pageImage} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

export function SongSheetViewer({ sheets, visible, onClose, title }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const sorted = useMemo(
    () => [...sheets].sort((a, b) => a.page_index - b.page_index),
    [sheets]
  );
  const [page, setPage] = useState(0);
  const current = sorted[page];

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(sorted.length - 1, p + 1)),
    [sorted.length]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title ?? '악보'}
          </Text>
          <IconButton icon="x" accessibilityLabel="닫기" onPress={onClose} />
        </View>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: c.textMid }}>등록된 악보가 없어요</Text>
          </View>
        ) : !current ? (
          <ActivityIndicator color={c.accent} />
        ) : (
          <>
            <ZoomablePage uri={current.image_url} key={current.id} />
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
              <Pressable
                onPress={goPrev}
                disabled={page <= 0}
                style={[styles.navBtn, { borderColor: c.border, opacity: page <= 0 ? 0.35 : 1 }]}
              >
                <Text style={{ color: c.text }}>이전</Text>
              </Pressable>
              <Text style={[styles.pageLabel, { color: c.textSub }]}>
                {page + 1} / {sorted.length}
              </Text>
              <Pressable
                onPress={goNext}
                disabled={page >= sorted.length - 1}
                style={[
                  styles.navBtn,
                  { borderColor: c.border, opacity: page >= sorted.length - 1 ? 0.35 : 1 },
                ]}
              >
                <Text style={{ color: c.text }}>다음</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

/** 인라인(필사 분할용) — 핀치 없이 페이지만 */
export function SongSheetInline({
  sheets,
  emptyLabel,
}: {
  sheets: SongSheet[];
  emptyLabel?: string;
}) {
  const c = useThemeColors();
  const sorted = useMemo(
    () => [...sheets].sort((a, b) => a.page_index - b.page_index),
    [sheets]
  );
  const [page, setPage] = useState(0);
  const current = sorted[page];
  const w = Dimensions.get('window').width;

  if (sorted.length === 0) {
    return (
      <View style={[styles.inlineEmpty, { borderColor: c.border }]}>
        <Text style={{ color: c.textSub, ...typeface.sans, fontSize: fontSize.sm }}>
          {emptyLabel ?? '악보 없음'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inlineRoot}>
      {current ? (
        <Image
          source={{ uri: current.image_url }}
          style={{ flex: 1, width: '100%' }}
          contentFit="contain"
        />
      ) : null}
      {sorted.length > 1 ? (
        <View style={styles.inlineNav}>
          <Pressable onPress={() => setPage((p) => Math.max(0, p - 1))} hitSlop={8}>
            <Text style={{ color: c.accent }}>‹</Text>
          </Pressable>
          <Text style={{ color: c.textSub, fontSize: 11 }}>
            {page + 1}/{sorted.length}
          </Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(sorted.length - 1, p + 1))}
            hitSlop={8}
          >
            <Text style={{ color: c.accent }}>›</Text>
          </Pressable>
        </View>
      ) : null}
      {/* keep width ref used */}
      {w < 0 ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: { ...typeface.sansMedium, fontSize: fontSize.base, flex: 1, marginRight: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoomWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageImage: { width: '100%', height: '100%' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pageLabel: { ...typeface.sans, fontSize: fontSize.sm },
  inlineRoot: { flex: 1 },
  inlineEmpty: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  inlineNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 6,
  },
});
