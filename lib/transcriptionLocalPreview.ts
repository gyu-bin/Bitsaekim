import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const DIR = 'transcription_previews';

function previewPath(transcriptionId: string): string {
  const base = FileSystem.documentDirectory ?? '';
  return `${base}${DIR}/${transcriptionId}.jpg`;
}

/** 필사 완료 캡처를 이 기기에만 보관 (같은 기록을 다시 완료하면 덮어씀) */
export async function saveTranscriptionPreview(
  transcriptionId: string,
  sourceUri: string
): Promise<boolean> {
  if (!transcriptionId || !sourceUri) return false;
  const base = FileSystem.documentDirectory;
  if (!base) return false;
  const dir = `${base}${DIR}`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const dest = previewPath(transcriptionId);
    const from = sourceUri.startsWith('file://') ? sourceUri : `file://${sourceUri}`;
    await FileSystem.copyAsync({ from, to: dest });
    return true;
  } catch {
    return false;
  }
}

/** 기기에 저장된 미리보기 JPEG 제거 */
export async function deleteTranscriptionPreviewFile(transcriptionId: string): Promise<void> {
  if (!transcriptionId) return;
  const path = previewPath(transcriptionId);
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* noop */
  }
}

/** expo-image / RN Image 에 넣을 file URI, 없으면 null */
export async function getTranscriptionPreviewFileUri(
  transcriptionId: string
): Promise<string | null> {
  if (!transcriptionId) return null;
  const path = previewPath(transcriptionId);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    if ('uri' in info && typeof info.uri === 'string' && info.uri.length > 0) {
      return info.uri;
    }
    return path.startsWith('file://') ? path : `file://${path}`;
  } catch {
    return null;
  }
}

/** 필사 완료 직후: DB에 기록된 transcriptions 행 id를 찾아서 캡처 JPEG를 기기에 저장 */
export async function persistPreviewAfterTranscriptionComplete(
  deviceId: string | null,
  worshipId: string,
  songId: string,
  captureUri: string
): Promise<void> {
  if (!deviceId || !captureUri) return;
  const { data } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('device_id', deviceId)
    .eq('worship_id', worshipId)
    .eq('song_id', songId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return;
  await saveTranscriptionPreview(data.id, captureUri);
}
