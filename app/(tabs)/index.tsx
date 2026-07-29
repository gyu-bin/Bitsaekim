import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedSprout } from '@/components/character/AnimatedSprout';
import { stageForPoints } from '@/components/character/Sprout';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useGardenColors } from '@/hooks/useGardenColors';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useUserStore } from '@/stores/userStore';

/** TODO(게임화): daily_activities·빛점수 RPC 연동 전까지 쓰는 플레이스홀더 값. */
const STREAK = 3;
const POINTS = 67;
const WEEK: { d: string; done?: boolean; today?: boolean; date?: string }[] = [
  { d: '일', done: true },
  { d: '월', done: true },
  { d: '화', done: true },
  { d: '수', today: true, date: '29' },
  { d: '목', date: '30' },
  { d: '금', date: '31' },
  { d: '토', date: '1' },
];

export default function HomeScreen() {
  const g = useGardenColors();
  const { horizontalGutter, insets, listBottomPadding } = useLayoutMetrics();
  const name = useUserStore((s) => s.name);
  const gatheringName = useUserStore((s) => s.gatheringName);

  const [celebrate, setCelebrate] = useState(false);
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cheer = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCelebrate(true);
    if (cheerTimer.current) clearTimeout(cheerTimer.current);
    cheerTimer.current = setTimeout(() => setCelebrate(false), 1200);
  }, []);

  const goTranscribe = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/transcribe');
  }, []);

  const stage = stageForPoints(POINTS);

  return (
    <ScrollView
      style={{ backgroundColor: g.cream }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: horizontalGutter,
        paddingBottom: listBottomPadding,
        gap: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetRow}>
        <Text style={[styles.greet, { color: g.ink }]}>
          {name ? `${name}님, ` : ''}오늘도 한 줄 새겨요
        </Text>
        <Text style={styles.greetLeaf}>🌱</Text>
      </View>

      {/* 정원 씬 */}
      <View style={[styles.scene, { backgroundColor: g.skyTop, borderColor: g.line }]}>
        <View style={[styles.grass, { backgroundColor: g.grass2 }]} />
        <View style={[styles.cloud, { top: 18, left: 24, width: 46, height: 15 }]} />
        <View style={[styles.cloud, { top: 34, right: 90, width: 32, height: 11 }]} />
        <Text style={[styles.flower, { left: 18, bottom: 12 }]}>🌷</Text>
        <Text style={[styles.flower, { left: 44, bottom: 10 }]}>🌸</Text>
        <Text style={[styles.flower, { right: 96, bottom: 12 }]}>🍓</Text>

        <View style={styles.sceneBtns}>
          <SceneButton icon="home" label="우리 마을" g={g} onPress={cheer} />
          <SceneButton icon="book-open" label="자료실" g={g} onPress={cheer} />
        </View>

        <Pressable
          onPress={cheer}
          style={styles.mascotWrap}
          accessibilityRole="button"
          accessibilityLabel="새싹이 쓰다듬기"
        >
          <AnimatedSprout size={128} stage={stage} celebrate={celebrate} />
        </Pressable>
      </View>

      {/* 스탯 */}
      <View style={styles.statRow}>
        <View style={[styles.stat, { backgroundColor: g.card, borderColor: g.line }]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={[styles.statNum, { color: g.ink }]}>{STREAK}</Text>
          <Text style={[styles.statLab, { color: g.muted }]}>일 연속</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: g.card, borderColor: g.line }]}>
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={[styles.statNum, { color: g.ink }]}>{POINTS}</Text>
          <Text style={[styles.statLab, { color: g.muted }]}>빛점수</Text>
        </View>
      </View>

      {/* 주차 네비 */}
      <View style={[styles.week, { backgroundColor: g.card, borderColor: g.line }]}>
        <View style={[styles.weekArw, { backgroundColor: g.cream2 }]}>
          <Feather name="chevron-left" size={15} color={g.inkSoft} />
        </View>
        <Text style={[styles.weekLabel, { color: g.ink }]}>5주차 · 7/26 주간</Text>
        <View style={styles.weekRight}>
          {gatheringName ? (
            <View style={[styles.badge, { backgroundColor: g.goldBg }]}>
              <Text style={[styles.badgeText, { color: g.goldInk }]} numberOfLines={1}>
                {gatheringName}
              </Text>
            </View>
          ) : null}
          <View style={[styles.weekArw, { backgroundColor: g.cream2 }]}>
            <Feather name="chevron-right" size={15} color={g.inkSoft} />
          </View>
        </View>
      </View>

      {/* 오늘의 정원 · 찬양 필사 (메인 미션) */}
      <View style={[styles.panel, { backgroundColor: g.card, borderColor: g.line }]}>
        <View style={styles.panelHead}>
          <Feather name="feather" size={16} color={g.green} />
          <Text style={[styles.panelTitle, { color: g.ink }]}>오늘의 정원 · 찬양 필사</Text>
        </View>
        <View style={styles.dots}>
          {WEEK.map((w) => (
            <WeekDot key={w.d} item={w} g={g} />
          ))}
        </View>
        <Pressable
          onPress={goTranscribe}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: g.green, opacity: pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
        >
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.ctaText}>오늘 필사하기</Text>
        </Pressable>
      </View>

      {/* 보조 미션 */}
      <MissionBar emoji="📖" title="성경읽기" g={g} action="go" onPress={cheer} />
      <MissionBar emoji="🙏" title="주일 공예배" g={g} action="done" />
    </ScrollView>
  );
}

function SceneButton({
  icon,
  label,
  g,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  g: ReturnType<typeof useGardenColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sceneBtn,
        { backgroundColor: g.card, borderColor: g.line, opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={13} color={g.ink} />
      <Text style={[styles.sceneBtnText, { color: g.ink }]}>{label}</Text>
    </Pressable>
  );
}

function WeekDot({
  item,
  g,
}: {
  item: (typeof WEEK)[number];
  g: ReturnType<typeof useGardenColors>;
}) {
  const bg = item.today ? g.goldBg : item.done ? g.greenSoft : g.cream2;
  const fg = item.today ? g.goldInk : item.done ? g.greenInk : g.muted;
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: bg },
        item.today && { borderWidth: 2, borderColor: g.gold },
      ]}
    >
      <Text style={[styles.dotDay, { color: fg }]}>{item.d}</Text>
      {item.done ? (
        <Feather name="check" size={13} color={fg} />
      ) : (
        <Text style={[styles.dotDate, { color: fg }]}>{item.date ?? ''}</Text>
      )}
    </View>
  );
}

function MissionBar({
  emoji,
  title,
  g,
  action,
  onPress,
}: {
  emoji: string;
  title: string;
  g: ReturnType<typeof useGardenColors>;
  action: 'go' | 'done';
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={action === 'done'}
      style={[styles.mission, { backgroundColor: g.greenBg }]}
    >
      <Text style={styles.missionTitle}>
        <Text>{emoji} </Text>
        <Text style={{ color: g.ink }}>{title}</Text>
      </Text>
      {action === 'done' ? (
        <View style={[styles.chip, { backgroundColor: g.green }]}>
          <Feather name="check" size={13} color="#fff" />
          <Text style={styles.chipText}>완료</Text>
        </View>
      ) : (
        <View style={[styles.chip, { backgroundColor: g.gold }]}>
          <Text style={styles.chipText}>시작하기</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingTop: 4 },
  greet: { ...typeface.sansMedium, fontSize: fontSize.lg },
  greetLeaf: { fontSize: fontSize.lg },

  scene: {
    height: 200,
    borderRadius: radius['3xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  grass: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '36%' },
  cloud: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.85, borderRadius: 999 },
  flower: { position: 'absolute', fontSize: 16 },
  sceneBtns: { position: 'absolute', right: 12, bottom: 14, gap: 8, zIndex: 3 },
  sceneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sceneBtnText: { ...typeface.sansMedium, fontSize: fontSize.xs },
  mascotWrap: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },

  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statEmoji: { fontSize: 18 },
  statNum: { ...typeface.sansMedium, fontSize: fontSize.lg },
  statLab: { ...typeface.sans, fontSize: fontSize.xs },

  week: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weekArw: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { ...typeface.sansMedium, fontSize: fontSize.sm },
  weekRight: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '42%' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.md, flexShrink: 1 },
  badgeText: { ...typeface.sansMedium, fontSize: fontSize.xs },

  panel: {
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelTitle: { ...typeface.sansMedium, fontSize: fontSize.base },
  dots: { flexDirection: 'row', gap: 5 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dotDay: { ...typeface.sans, fontSize: 9 },
  dotDate: { ...typeface.sansMedium, fontSize: fontSize.xs },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.lg,
  },
  ctaText: { ...typeface.sansMedium, fontSize: fontSize.base, color: '#fff' },

  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: radius.lg,
  },
  missionTitle: { ...typeface.sansMedium, fontSize: fontSize.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  chipText: { ...typeface.sansMedium, fontSize: fontSize.xs, color: '#fff' },
});
