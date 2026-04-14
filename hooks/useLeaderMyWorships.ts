import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { WorshipService } from '@/types';

/** 모임장: 모임 예배 전체. 그 외 인도자: 내가 creator 인 예배만(대부분 없음) */
export function useLeaderMyWorships(deviceId: string | null, enabled: boolean) {
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);

  const isGatheringOwner = !!(
    deviceId &&
    gatheringOwnerDeviceId &&
    deviceId === gatheringOwnerDeviceId
  );

  return useQuery({
    queryKey: ['leader-my-worships', deviceId, gatheringId, isGatheringOwner],
    queryFn: async () => {
      if (!deviceId || !gatheringId) return [];
      let q = supabase
        .from('worship_services')
        .select('*')
        .eq('gathering_id', gatheringId)
        .order('service_date', { ascending: false });
      if (!isGatheringOwner) {
        q = q.eq('creator_id', deviceId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorshipService[];
    },
    enabled: enabled && !!deviceId && !!gatheringId,
  });
}
