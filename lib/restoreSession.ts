import {
  getDeviceIdCandidates,
  rememberRegisteredDeviceId,
} from '@/lib/device';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { raceOrTimeout } from '@/lib/withTimeout';
import { useUserStore } from '@/stores/userStore';

const QUERY_TIMEOUT_MS = 10_000;

export type RestoredSession = {
  deviceId: string;
  name: string;
  role: 'user' | 'leader';
  gathering: {
    id: string;
    name: string;
    inviteCode: string;
    ownerDeviceId: string | null;
  } | null;
};

type RpcGatheringRow = {
  gathering_id: string;
  gathering_name: string;
  invite_code: string;
  created_by?: string | null;
};

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

async function fetchGatheringForDevice(deviceId: string): Promise<RestoredSession['gathering']> {
  const rpcResult = await raceOrTimeout(
    supabase.rpc('restore_session_for_device', { p_device_id: deviceId }),
    QUERY_TIMEOUT_MS
  );

  if (rpcResult && !rpcResult.error) {
    const row = firstRow<RpcGatheringRow>(rpcResult.data);
    if (row?.gathering_id) {
      return {
        id: row.gathering_id,
        name: row.gathering_name,
        inviteCode: row.invite_code,
        ownerDeviceId: row.created_by ?? null,
      };
    }
    return null;
  }

  const memberResult = await raceOrTimeout(
    supabase
      .from('gathering_members')
      .select('gathering_id, gathering:gatherings(id, name, invite_code, created_by)')
      .eq('device_id', deviceId)
      .order('joined_at', { ascending: false })
      .limit(1),
    QUERY_TIMEOUT_MS
  );

  if (!memberResult || memberResult.error || !memberResult.data?.[0]) return null;

  const g = memberResult.data[0].gathering;
  const row = Array.isArray(g) ? g[0] : g;
  if (!row || typeof row !== 'object' || !('id' in row)) return null;

  const typed = row as {
    id: string;
    name: string;
    invite_code: string;
    created_by?: string | null;
  };
  return {
    id: typed.id,
    name: typed.name,
    inviteCode: typed.invite_code,
    ownerDeviceId: typed.created_by ?? null,
  };
}

/** 이 기기에 등록된 계정이 있는지 서버에서 조회합니다. */
export async function fetchSessionForDevice(deviceId: string): Promise<RestoredSession | null> {
  if (!isSupabaseConfigured()) return null;

  const userResult = await raceOrTimeout(
    supabase.from('users').select('device_id, name, role').eq('device_id', deviceId).maybeSingle(),
    QUERY_TIMEOUT_MS
  );

  const user = userResult?.data;
  if (!userResult || userResult.error || !user?.name) return null;

  const role = user.role === 'leader' ? 'leader' : 'user';
  const gathering = await fetchGatheringForDevice(deviceId);

  return {
    deviceId,
    name: user.name,
    role,
    gathering,
  };
}

/** 온보딩·자동 복구용: 저장된 기기 ID들로 세션을 찾습니다 (후보 병렬 조회). */
export async function probeExistingSession(): Promise<RestoredSession | null> {
  if (!isSupabaseConfigured()) return null;

  const candidates = await getDeviceIdCandidates();
  if (candidates.length === 0) return null;

  const sessions = await Promise.all(candidates.map((id) => fetchSessionForDevice(id)));
  const session = sessions.find((s) => s !== null) ?? null;
  if (session) {
    await rememberRegisteredDeviceId(session.deviceId);
  }
  return session;
}

/** 조회한 세션을 스토어에 반영합니다. */
export async function applyRestoredSession(session: RestoredSession) {
  await rememberRegisteredDeviceId(session.deviceId);
  const store = useUserStore.getState();
  store.setUser(session.deviceId, session.name, session.role);
  store.setRole(session.role);
  if (session.gathering) {
    store.setGathering(
      session.gathering.id,
      session.gathering.name,
      session.gathering.inviteCode,
      session.gathering.ownerDeviceId
    );
  } else {
    store.clearGathering();
  }
  store.setOnboarded();
}
