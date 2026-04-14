import { supabase } from '@/lib/supabase';

function isTransientRpcError(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('503') ||
    m.includes('502') ||
    m.includes('504')
  );
}

function mapRpcErrorToMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes('could not find the function') ||
    (m.includes('function') && m.includes('does not exist'))
  ) {
    return '이름 저장 기능이 서버에 아직 반영되지 않았을 수 있습니다. 잠시 후 다시 시도해 주세요.';
  }
  return msg;
}

export async function updateUserDisplayName(
  deviceId: string,
  name: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: '이름을 입력해 주세요.' };
  }
  const id = deviceId.trim();

  let rpc = await supabase.rpc('update_user_name_for_device', {
    p_device_id: id,
    p_name: trimmed,
  });

  if (rpc.error && isTransientRpcError(rpc.error)) {
    await new Promise((r) => setTimeout(r, 400));
    rpc = await supabase.rpc('update_user_name_for_device', {
      p_device_id: id,
      p_name: trimmed,
    });
  }

  if (rpc.error) {
    const raw =
      typeof rpc.error.message === 'string' && rpc.error.message.length > 0
        ? rpc.error.message
        : '저장에 실패했습니다.';
    return { ok: false, message: mapRpcErrorToMessage(raw) };
  }

  return { ok: true };
}
