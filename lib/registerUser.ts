import { supabase } from '@/lib/supabase';
import { raceOrTimeout } from '@/lib/withTimeout';

const RPC_TIMEOUT_MS = 15_000;

type RegisterRow = { user_device_id: string; user_name: string; user_role: string };

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

/** RLS를 우회해 기기 ID로 사용자를 등록하거나 이름을 갱신합니다. */
export async function registerUserForDevice(
  deviceId: string,
  name: string,
  role: 'user' | 'leader' = 'user'
): Promise<{ deviceId: string; name: string; role: string }> {
  const result = await raceOrTimeout(
    supabase.rpc('register_user_for_device', {
      p_device_id: deviceId,
      p_name: name,
      p_role: role,
    }),
    RPC_TIMEOUT_MS
  );

  if (!result) {
    throw new Error('서버 응답이 없습니다. 네트워크 연결을 확인해 주세요.');
  }
  if (result.error) throw result.error;

  const row = firstRow<RegisterRow>(result.data);
  if (!row?.user_device_id) {
    throw new Error('사용자 정보를 저장하지 못했습니다.');
  }
  return {
    deviceId: row.user_device_id,
    name: row.user_name,
    role: row.user_role,
  };
}
