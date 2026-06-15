import { useEffect } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type RestoreRow = {
  gathering_id: string;
  gathering_name: string;
  invite_code: string;
  created_by?: string | null;
};

function firstRestoreRow(data: unknown): RestoreRow | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as RestoreRow | undefined;
  if (typeof data === 'object') return data as RestoreRow;
  return undefined;
}

/** 모임장·모임 이름 등 서버와 동기화 (로컬 저장소 깨짐·구버전 보완) */
export function useHydrateGatheringOwner() {
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const ownerId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const setGathering = useUserStore((s) => s.setGathering);
  const setGatheringOwner = useUserStore((s) => s.setGatheringOwner);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!deviceId || !gatheringId) return;

    let cancelled = false;
    void (async () => {
      const restored = await supabase.rpc('restore_session_for_device', {
        p_device_id: deviceId,
      });
      if (cancelled) return;

      const row = !restored.error ? firstRestoreRow(restored.data) : undefined;
      if (row?.gathering_id) {
        const store = useUserStore.getState();
        setGathering(
          row.gathering_id,
          row.gathering_name,
          row.invite_code,
          row.created_by ?? store.gatheringOwnerDeviceId
        );
        if (row.created_by) setGatheringOwner(row.created_by);
        return;
      }

      if (ownerId) return;

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
  }, [deviceId, gatheringId, ownerId, setGathering, setGatheringOwner]);
}
