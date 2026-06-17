import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';

type Slide = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  footnote?: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'edit-3',
    title: '빛 가운데 새기는 찬양',
    description: '예배 후 찬양 가사를 필사하며\n묵상을 기록해요',
  },
  {
    id: '2',
    icon: 'users',
    title: '모임과 함께',
    description: '예배 팀·소그룹이 콘티를 공유하고\n나눔을 함께해요',
  },
  {
    id: '3',
    icon: 'key',
    title: '지금 시작해요',
    description: '인도자에게 초대 코드를 받아 참여하거나,\n새 모임을 개설하세요',
    footnote: '예: A1B2C3D4',
  },
];

type Props = {
  onDone: () => void;
  onSkip: () => void;
};

export function OnboardingIntroSlides({ onDone, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next >= 0 && next < SLIDES.length) setIndex(next);
    },
    [width]
  );

  const handleSkip = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  const renderItem: ListRenderItem<Slide> = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconRing}>
        <Feather name={item.icon} size={40} color={palette.gold} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.description}</Text>
      {item.footnote ? <Text style={styles.slideFoot}>{item.footnote}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.glowTop} pointerEvents="none" />

      <Pressable
        style={styles.skipBtn}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="건너뛰기"
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        bounces={false}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === index && styles.dotOn]}
              accessibilityRole="none"
            />
          ))}
        </View>

        <Button
          title={isLast ? '시작하기' : '다음'}
          onPress={handleNext}
          containerStyle={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(212, 169, 106, 0.14)',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  skipText: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.5)',
  },
  list: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(212, 169, 106, 0.45)',
    backgroundColor: 'rgba(184, 147, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    ...typeface.serifBold,
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  slideDesc: {
    ...typeface.sans,
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 26,
  },
  slideFoot: {
    ...typeface.mono,
    fontSize: fontSize.md,
    color: palette.goldLight,
    marginTop: 20,
    letterSpacing: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotOn: {
    width: 22,
    backgroundColor: palette.gold,
  },
  cta: { marginTop: 0 },
});
