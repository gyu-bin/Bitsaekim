import { useEffect } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

/** 예전 저장소에 `gatheringOwnerDeviceId` 없을 때 RPC로 채움 */
export function useHydrateGatheringOwner() {
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const ownerId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const setGatheringOwner = useUserStore((s) => s.setGatheringOwner);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!deviceId || !gatheringId || ownerId) return;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc('get_gathering_owner_for_member', {
        p_device_id: deviceId,
        p_gathering_id: gatheringId,
      });
      if (cancelled || error) return;
      const v = typeof data === 'string' && data.length > 0 ? data : null;
      if (v) setGatheringOwner(v);
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId, gatheringId, ownerId, setGatheringOwner]);
}
