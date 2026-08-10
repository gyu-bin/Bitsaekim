import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export type HomeWeekDay = {
  date: string;
  dateLabel: string;
  done: boolean;
  today: boolean;
};

export type HomeSummary = {
  streak: number;
  points: number;
  weekDays: HomeWeekDay[];
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildLocalWeekDays(
  weekStart: Date,
  doneDates: Set<string>
): HomeWeekDay[] {
  const today = toYmd(new Date());
  const days: HomeWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ymd = toYmd(d);
    days.push({
      date: ymd,
      dateLabel: String(d.getDate()),
      done: doneDates.has(ymd),
      today: ymd === today,
    });
  }
  return days;
}

/** 스트릭: 오늘(또는 어제)부터 연속으로 미션이 있는 일수 */
function calcStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  const set = new Set(activityDates);
  const cursor = new Date();
  const today = toYmd(cursor);
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(toYmd(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(toYmd(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const POINTS: Record<string, number> = {
  transcription: 15,
  bible_reading: 10,
  sunday_worship: 20,
  meditation_prayer: 10,
};

/**
 * 홈 요약. RPC가 있으면 사용하고, 없으면 transcriptions·daily_activities로 폴백.
 */
export function useHomeSummary(weekStart: Date) {
  const deviceId = useUserStore((s) => s.deviceId);
  const weekStartYmd = toYmd(weekStart);

  return useQuery({
    queryKey: ['home-summary', deviceId, weekStartYmd],
    queryFn: async (): Promise<HomeSummary> => {
      if (!deviceId) {
        return { streak: 0, points: 0, weekDays: buildLocalWeekDays(weekStart, new Set()) };
      }

      const rpc = await supabase.rpc('get_home_summary', {
        p_device_id: deviceId,
        p_week_start: weekStartYmd,
      });

      if (!rpc.error && rpc.data) {
        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        if (row && typeof row === 'object') {
          const r = row as {
            streak?: number;
            points?: number;
            week_done_dates?: string[] | null;
          };
          const done = new Set(
            (r.week_done_dates ?? []).map((d) => String(d).slice(0, 10))
          );
          return {
            streak: Number(r.streak ?? 0),
            points: Number(r.points ?? 0),
            weekDays: buildLocalWeekDays(weekStart, done),
          };
        }
      }

      // 폴백: transcriptions 완료일 기준
      const { data: txs } = await supabase
        .from('transcriptions')
        .select('completed_at')
        .eq('device_id', deviceId)
        .order('completed_at', { ascending: false })
        .limit(400);

      const dates = new Set<string>();
      for (const row of txs ?? []) {
        const raw = row.completed_at as string | null;
        if (!raw) continue;
        dates.add(raw.slice(0, 10));
      }

      const { data: acts } = await supabase
        .from('daily_activities')
        .select('activity_date, type')
        .eq('device_id', deviceId);

      let points = 0;
      if (acts && acts.length > 0) {
        for (const a of acts) {
          dates.add(String(a.activity_date).slice(0, 10));
          points += POINTS[String(a.type)] ?? 0;
        }
      } else {
        points = dates.size * POINTS.transcription;
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekDone = new Set(
        [...dates].filter((d) => d >= weekStartYmd && d <= toYmd(weekEnd))
      );

      return {
        streak: calcStreak([...dates]),
        points,
        weekDays: buildLocalWeekDays(weekStart, weekDone),
      };
    },
    enabled: !!deviceId,
    staleTime: 30_000,
  });
}
