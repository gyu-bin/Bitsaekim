import { uploadAvatarJpegFromUri } from '@/lib/image';
import { resolveProfilePhotoUri } from '@/lib/profilePhoto';
import { supabase } from '@/lib/supabase';

export async function syncUserAvatarFromLocal(
  deviceId: string,
  localUri: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const fileUri = resolveProfilePhotoUri(localUri) ?? localUri;
  const publicUrl = await uploadAvatarJpegFromUri(deviceId, fileUri);
  if (!publicUrl) {
    return { ok: false, message: '프로필 사진을 올리지 못했습니다. 네트워크를 확인해 주세요.' };
  }

  const { error } = await supabase.rpc('update_user_avatar_for_device', {
    p_device_id: deviceId,
    p_avatar_url: publicUrl,
  });
  if (error) {
    const msg =
      typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : '프로필 사진 정보를 저장하지 못했습니다.';
    return { ok: false, message: msg };
  }

  return { ok: true, publicUrl };
}

export async function clearUserAvatarOnServer(
  deviceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('update_user_avatar_for_device', {
    p_device_id: deviceId,
    p_avatar_url: null,
  });
  if (error) {
    const msg =
      typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : '프로필 사진을 삭제하지 못했습니다.';
    return { ok: false, message: msg };
  }
  return { ok: true };
}
