import { deleteTranscriptionPreviewFile } from '@/lib/transcriptionLocalPreview';
import { supabase } from '@/lib/supabase';

function isRpcMissing(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return (
    m.includes('could not find the function') ||
    m.includes('schema cache') ||
    m.includes('does not exist')
  );
}

async function deleteTranscriptionDirect(args: {
  transcriptionId: string;
  deviceId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('transcriptions')
    .delete()
    .eq('id', args.transcriptionId)
    .eq('device_id', args.deviceId)
    .select('id');
  if (error) {
    return { ok: false, message: error.message ?? '삭제에 실패했습니다.' };
  }
  if (!data?.length) {
    return { ok: false, message: '삭제할 수 없거나 이미 없는 기록입니다.' };
  }
  return { ok: true };
}

export async function deleteTranscriptionForDevice(args: {
  transcriptionId: string;
  deviceId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const deviceId = args.deviceId.trim();
  const rpc = await supabase.rpc('delete_transcription_for_device', {
    p_transcription_id: args.transcriptionId,
    p_device_id: deviceId,
  });

  if (rpc.error) {
    if (isRpcMissing(rpc.error)) {
      const d = await deleteTranscriptionDirect({ ...args, deviceId });
      if (d.ok) await deleteTranscriptionPreviewFile(args.transcriptionId);
      return d;
    }
    return { ok: false, message: rpc.error.message ?? '삭제에 실패했습니다.' };
  }

  if (rpc.data !== true) {
    return { ok: false, message: '이 기록을 삭제할 수 없습니다.' };
  }

  await deleteTranscriptionPreviewFile(args.transcriptionId);
  return { ok: true };
}
