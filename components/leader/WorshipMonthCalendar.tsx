import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthCells(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay();
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const prevDim = new Date(year, monthIndex, 0).getDate();
  const out: Date[] = [];
  for (let i = 0; i < startDow; i++) {
    const day = prevDim - startDow + i + 1;
    out.push(new Date(year, monthIndex - 1, day));
  }
  for (let d = 1; d <= dim; d++) {
    out.push(new Date(year, monthIndex, d));
  }
  let next = 1;
  while (out.length % 7 !== 0) {
    out.push(new Date(year, monthIndex + 1, next));
    next += 1;
  }
  while (out.length < 42) {
    out.push(new Date(year, monthIndex + 1, next));
    next += 1;
  }
  return out;
}

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

/** 가운데 년월 + 좌우 화살표, 한국어 요일 그리드 */
export function WorshipMonthCalendar({ value, onChange }: Props) {
  const c = useThemeColors();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const cells = useMemo(() => buildMonthCells(y, m), [y, m]);

  const shift = (delta: number) => {
    setViewMonth(new Date(y, m + delta, 1));
  };

  const today = new Date();

  return (
    <View style={styles.root}>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => shift(-1)}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}
          hitSlop={10}
          accessibilityLabel="이전 달"
        >
          <Feather name="chevron-left" size={26} color={c.accent} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: c.text }]} accessibilityRole="header">
          {y}년 {m + 1}월
        </Text>
        <Pressable
          onPress={() => shift(1)}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}
          hitSlop={10}
          accessibilityLabel="다음 달"
        >
          <Feather name="chevron-right" size={26} color={c.accent} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEK_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.weekCell,
              { color: i === 0 ? '#c45c48' : c.textSub },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={styles.dayRow}>
          {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
            const inMonth = cell.getMonth() === m;
            const selected = sameDay(cell, value);
            const sunday = cell.getDay() === 0;
            return (
              <Pressable
                key={`d-${row}-${col}`}
                onPress={() => onChange(new Date(cell))}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayInner,
                    selected && { backgroundColor: c.accent },
                    !selected && sameDay(cell, today) && { borderWidth: 1.5, borderColor: c.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: selected
                          ? '#fff'
                          : !inMonth
                            ? c.textSub
                            : sunday
                              ? '#c45c48'
                              : c.text,
                      },
                      !inMonth && styles.dayMuted,
                    ]}
                  >
                    {cell.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingTop: 4,
    paddingBottom: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  navPressed: {
    opacity: 0.65,
  },
  monthTitle: {
    ...typeface.sansMedium,
    fontSize: fontSize.lg,
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    paddingVertical: 4,
  },
  dayRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 52,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
  dayMuted: {
    opacity: 0.45,
  },
});
