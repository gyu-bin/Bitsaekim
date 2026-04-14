import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { SetlistItem } from '@/types';

/** 여러 예배의 콘티를 한 번에 (필사 탭 홈 등) */
export function useSetlistsByWorshipIds(worshipIds: string[]) {
  const sortedKey = [...worshipIds].sort().join(',');
  return useQuery({
    queryKey: ['setlists-bulk', sortedKey],
    queryFn: async () => {
      if (worshipIds.length === 0) return {} as Record<string, SetlistItem[]>;
      const { data, error } = await supabase
        .from('setlist_items')
        .select('*, song:songs(*)')
        .in('worship_id', worshipIds)
        .order('order_index');
      if (error) throw error;
      const rows = (data ?? []) as SetlistItem[];
      const by: Record<string, SetlistItem[]> = {};
      for (const id of worshipIds) {
        by[id] = [];
      }
      for (const row of rows) {
        const wid = row.worship_id;
        if (!by[wid]) by[wid] = [];
        by[wid].push(row);
      }
      for (const wid of Object.keys(by)) {
        by[wid].sort((a, b) => a.order_index - b.order_index);
      }
      return by;
    },
    enabled: worshipIds.length > 0,
  });
}

export function useSetlistByWorship(worshipId: string | undefined) {
  return useQuery({
    queryKey: ['setlist', worshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setlist_items')
        .select('*, song:songs(*)')
        .eq('worship_id', worshipId!)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as SetlistItem[];
    },
    enabled: !!worshipId,
  });
}

export function useCreatorName(creatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('device_id', creatorId!)
        .maybeSingle();
      if (error) throw error;
      return data?.name ?? '인도자';
    },
    enabled: !!creatorId,
  });
}
