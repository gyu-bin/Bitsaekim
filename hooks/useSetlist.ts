import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { SetlistItem } from '@/types';

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
