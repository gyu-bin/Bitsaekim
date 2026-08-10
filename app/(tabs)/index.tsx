import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useHomeSummary } from '@/hooks/useHomeSummary';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/stores/userStore';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const m = weekStart.getMonth() + 1;
  const d0 = weekStart.getDate();
  const d1 = end.getDate();
  return `${m}/${d0}–${d1} 주간`;
}

export default function HomeScreen() {
  const c = useThemeColors();
  const { horizontalGutter, insets, listBottomPadding } = useLayoutMetrics();
  const name = useUserStore((s) => s.name);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringName = useUserStore((s) => s.gatheringName);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const base = startOfWeekSunday(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const { data: summary, isLoading } = useHomeSummary(weekStart);
  const streak = summary?.streak ?? 0;
  const points = summary?.points ?? 0;
  const weekDays = summary?.weekDays ?? [];

  const goTranscribe = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/transcribe');
  }, []);

  const goJoin = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/join-gathering' as Href);
  }, []);

  const shiftWeek = useCallback((delta: number) => {
    void Haptics.selectionAsync();
    setWeekOffset((o) => o + delta);
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: horizontalGutter,
        paddingBottom: listBottomPadding,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.greet, { color: c.text }]}>
            {name ? `${name}님` : '빛새김'}
          </Text>
          <Text style={[styles.sub, { color: c.textMid }]}>오늘도 한 줄 새겨요</Text>
        </View>
        {gatheringName ? (
          <View style={[styles.badge, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[styles.badgeText, { color: c.textMid }]} numberOfLines={1}>
              {gatheringName}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={goJoin}
            style={[styles.badge, { borderColor: c.border }]}
            accessibilityRole="button"
            accessibilityLabel="모임 참여"
          >
            <Text style={[styles.badgeText, { color: c.accent }]}>모임 참여</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statRow}>
        <View style={[styles.stat, { borderColor: c.border }]}>
          <Text style={[styles.statLab, { color: c.textSub }]}>연속</Text>
          <Text style={[styles.statNum, { color: c.text }]}>
            {isLoading ? '—' : `${streak}일`}
          </Text>
        </View>
        <View style={[styles.stat, { borderColor: c.border }]}>
          <Text style={[styles.statLab, { color: c.textSub }]}>빛점수</Text>
          <Text style={[styles.statNum, { color: c.text }]}>
            {isLoading ? '—' : points}
          </Text>
        </View>
      </View>

      <View style={[styles.week, { borderColor: c.border }]}>
        <Pressable
          onPress={() => shiftWeek(-1)}
          style={styles.weekArw}
          accessibilityRole="button"
          accessibilityLabel="이전 주"
        >
          <Feather name="chevron-left" size={18} color={c.textMid} />
        </Pressable>
        <Text style={[styles.weekLabel, { color: c.text }]}>{formatWeekLabel(weekStart)}</Text>
        <Pressable
          onPress={() => shiftWeek(1)}
          style={styles.weekArw}
          accessibilityRole="button"
          accessibilityLabel="다음 주"
          disabled={weekOffset >= 0}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={weekOffset >= 0 ? c.border : c.textMid}
          />
        </Pressable>
      </View>

      <View style={[styles.panel, { borderColor: c.border }]}>
        <Text style={[styles.panelTitle, { color: c.text }]}>이번 주 필사</Text>
        <View style={styles.dots}>
          {WEEKDAY_LABELS.map((label, i) => {
            const day = weekDays[i];
            const done = !!day?.done;
            const today = !!day?.today;
            return (
              <View
                key={label}
                style={[
                  styles.dot,
                  {
                    borderColor: today ? c.accent : c.border,
                    backgroundColor: done ? c.accentMuted : c.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dotDay,
                    { color: today ? c.accent : done ? c.text : c.textSub },
                  ]}
                >
                  {label}
                </Text>
                {done ? (
                  <Feather name="check" size={12} color={c.accent} />
                ) : (
                  <Text style={[styles.dotDate, { color: c.textSub }]}>
                    {day?.dateLabel ?? ''}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <Button title="오늘 필사하기" onPress={goTranscribe} />
      </View>

      {gatheringId ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            router.push('/village' as Href);
          }}
          style={[styles.linkRow, { borderColor: c.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.linkTitle, { color: c.text }]}>우리 모임</Text>
          <Feather name="chevron-right" size={16} color={c.textSub} />
        </Pressable>
      ) : (
        <View style={[styles.soloHint, { backgroundColor: c.surface }]}>
          <Text style={[styles.soloHintText, { color: c.textMid }]}>
            지금은 혼자 쓰는 중이에요. 모임에 들어가면 함께 나눌 수 있어요.
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push('/resources' as Href);
        }}
        style={[styles.linkRow, { borderColor: c.border }]}
        accessibilityRole="button"
      >
        <Text style={[styles.linkTitle, { color: c.text }]}>자료실</Text>
        <Feather name="chevron-right" size={16} color={c.textSub} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 4 },
  greet: { ...typeface.serifBold, fontSize: fontSize['2xl'] },
  sub: { ...typeface.sans, fontSize: fontSize.sm },
  badge: {
    maxWidth: '38%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { ...typeface.sansMedium, fontSize: fontSize.xs },

  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
  },
  statLab: { ...typeface.sans, fontSize: fontSize.xs },
  statNum: { ...typeface.sansMedium, fontSize: fontSize.xl },

  week: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  weekArw: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { ...typeface.sansMedium, fontSize: fontSize.sm },

  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: { ...typeface.sansMedium, fontSize: fontSize.base },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dotDay: { ...typeface.sans, fontSize: 9 },
  dotDate: { ...typeface.sansMedium, fontSize: fontSize.xs },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkTitle: { ...typeface.sansMedium, fontSize: fontSize.sm },
  soloHint: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  soloHintText: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20 },
});
