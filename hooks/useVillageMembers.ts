import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export type VillageMember = {
  device_id: string;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  activity_days: number;
  points: number;
};

export function useVillageMembers() {
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);

  return useQuery({
    queryKey: ['village-members', deviceId, gatheringId],
    queryFn: async (): Promise<VillageMember[]> => {
      if (!deviceId || !gatheringId) return [];
      const { data, error } = await supabase.rpc('list_gathering_members_summary', {
        p_device_id: deviceId,
        p_gathering_id: gatheringId,
      });
      if (error) throw error;
      return (data ?? []) as VillageMember[];
    },
    enabled: !!deviceId && !!gatheringId,
    staleTime: 30_000,
  });
}
