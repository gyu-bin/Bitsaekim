import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Sprout, type SproutMood, type SproutStage } from '@/components/character/Sprout';

type Props = {
  size?: number;
  stage?: SproutStage;
  mood?: SproutMood;
  /** 잔잔하게 까딱이는 idle 모션 (기본 on) */
  bob?: boolean;
  /** true로 바뀌는 순간 "뿌듯" 표정 + 반짝 팝 애니메이션 (필사 완료 축하 등) */
  celebrate?: boolean;
};

/** 마스코트에 숨쉬는 idle 모션과 완료 축하 반짝임을 입힌 래퍼. */
function AnimatedSproutBase({
  size = 120,
  stage = 'seedling',
  mood = 'default',
  bob = true,
  celebrate = false,
}: Props) {
  const reduced = useReducedMotion();
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const pop = useSharedValue(0);
  const spark = useSharedValue(0);

  useEffect(() => {
    if (bob && !reduced) {
      ty.value = withRepeat(
        withTiming(-6, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      rot.value = withRepeat(
        withSequence(
          withTiming(-0.035, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.035, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      ty.value = withTiming(0);
      rot.value = withTiming(0);
    }
  }, [bob, reduced, ty, rot]);

  useEffect(() => {
    if (!celebrate) return;
    if (reduced) return;
    pop.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2.2)) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
    );
    spark.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(260, withTiming(0, { duration: 280 })),
    );
  }, [celebrate, reduced, pop, spark]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: ty.value },
      { rotate: `${rot.value}rad` },
      { scale: 1 + pop.value * 0.14 },
    ],
  }));

  const sparkStyle = useAnimatedStyle(() => ({
    opacity: spark.value,
    transform: [{ scale: 0.5 + spark.value * 0.7 }],
  }));

  const shownMood: SproutMood = celebrate ? 'proud' : mood;
  const height = (size * 190) / 160;

  return (
    <View style={[styles.host, { width: size, height }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.spark, sparkStyle]}
        accessibilityElementsHidden
      >
        <Text style={[styles.sparkEmoji, { fontSize: size * 0.18 }]}>✨</Text>
        <Text style={[styles.sparkEmoji, styles.sparkRight, { fontSize: size * 0.14 }]}>✨</Text>
        <Text style={[styles.sparkEmoji, styles.sparkTop, { fontSize: size * 0.12 }]}>✨</Text>
      </Animated.View>
      <Animated.View style={bodyStyle}>
        <Sprout size={size} stage={stage} mood={shownMood} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  spark: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  sparkEmoji: {
    position: 'absolute',
    left: '4%',
    top: '10%',
  },
  sparkRight: {
    left: undefined,
    right: '2%',
    top: '30%',
  },
  sparkTop: {
    left: '38%',
    top: '-2%',
  },
});

export const AnimatedSprout = memo(AnimatedSproutBase);
