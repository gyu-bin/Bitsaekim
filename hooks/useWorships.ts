import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { WorshipService } from '@/types';

export function useWorships() {
  const gatheringId = useUserStore((s) => s.gatheringId);

  return useQuery({
    queryKey: ['worships', gatheringId],
    queryFn: async () => {
      if (!gatheringId) return [];
      const { data, error } = await supabase
        .from('worship_services')
        .select('*')
        .eq('gathering_id', gatheringId)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorshipService[];
    },
    enabled: !!gatheringId,
  });
}
