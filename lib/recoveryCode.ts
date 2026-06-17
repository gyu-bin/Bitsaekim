import { rememberRegisteredDeviceId } from '@/lib/device';
import { applyRestoredSession, fetchSessionForDevice } from '@/lib/restoreSession';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export type RestoreByCodeResult =
  | {
      success: true;
      deviceId: string;
      name: string;
      role: 'user' | 'leader';
      recoveryCode: string | null;
    }
  | { success: false; error: string };

type RpcRestorePayload = {
  success?: boolean;
  error?: string;
  device_id?: string;
  name?: string;
  role?: string;
  recovery_code?: string | null;
};

export async function fetchRecoveryCodeForDevice(deviceId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('users')
    .select('recovery_code')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error || !data?.recovery_code) return null;
  return data.recovery_code;
}

export async function generateRecoveryCode(deviceId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.rpc('generate_recovery_code_for_device', {
    p_device_id: deviceId,
  });
  if (error) return null;
  return typeof data === 'string' ? data : null;
}

export async function restoreSessionByRecoveryCode(
  recoveryCode: string,
  newDeviceId: string
): Promise<RestoreByCodeResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: '서버 연결 설정이 필요해요' };
  }

  const { data, error } = await supabase.rpc('restore_session_by_recovery_code', {
    p_recovery_code: recoveryCode.trim(),
    p_new_device_id: newDeviceId,
  });

  if (error) {
    return { success: false, error: error.message || '복구에 실패했어요' };
  }

  const payload = data as RpcRestorePayload | null;
  if (!payload?.success) {
    return { success: false, error: payload?.error ?? '코드를 다시 확인해 주세요' };
  }

  const deviceId = payload.device_id?.trim();
  const name = payload.name?.trim();
  if (!deviceId || !name) {
    return { success: false, error: '복구 정보를 불러오지 못했어요' };
  }

  const role = payload.role === 'leader' ? 'leader' : 'user';
  return {
    success: true,
    deviceId,
    name,
    role,
    recoveryCode: payload.recovery_code ?? null,
  };
}

/** 복구 코드로 세션 복원 후 스토어·기기 ID 반영 */
export async function applyRecoveryCodeSession(
  recoveryCode: string,
  newDeviceId: string
): Promise<RestoreByCodeResult> {
  const result = await restoreSessionByRecoveryCode(recoveryCode, newDeviceId);
  if (!result.success) return result;

  await rememberRegisteredDeviceId(result.deviceId);
  const session = await fetchSessionForDevice(result.deviceId);
  if (session) {
    await applyRestoredSession(session);
  } else {
    const store = useUserStore.getState();
    store.setUser(result.deviceId, result.name, result.role);
    store.setRole(result.role);
    store.setOnboarded();
  }

  if (result.recoveryCode) {
    useUserStore.getState().setRecoveryCode(result.recoveryCode);
  }

  return result;
}
