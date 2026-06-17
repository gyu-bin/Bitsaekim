import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type GatheringInviteSettings = {
  inviteCode: string;
  inviteCodeActive: boolean;
  inviteCodeExpiresAt: string | null;
};

type RpcSettings = {
  invite_code?: string;
  invite_code_active?: boolean;
  invite_code_expires_at?: string | null;
};

export async function fetchGatheringInviteSettings(
  deviceId: string,
  gatheringId: string
): Promise<GatheringInviteSettings | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.rpc('get_gathering_invite_settings_for_leader', {
    p_device_id: deviceId,
    p_gathering_id: gatheringId,
  });
  if (error || !data || typeof data !== 'object') return null;
  const row = data as RpcSettings;
  if (!row.invite_code) return null;
  return {
    inviteCode: row.invite_code,
    inviteCodeActive: row.invite_code_active !== false,
    inviteCodeExpiresAt: row.invite_code_expires_at ?? null,
  };
}

export async function setGatheringInviteActive(
  deviceId: string,
  gatheringId: string,
  active: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.rpc('set_gathering_invite_active_for_leader', {
    p_device_id: deviceId,
    p_gathering_id: gatheringId,
    p_active: active,
  });
  return !error;
}

export async function regenerateGatheringInviteCode(
  deviceId: string,
  gatheringId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.rpc('regenerate_gathering_invite_code_for_leader', {
    p_device_id: deviceId,
    p_gathering_id: gatheringId,
  });
  if (error || typeof data !== 'string') return null;
  return data;
}
