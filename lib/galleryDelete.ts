import { getGalleryObjectPathFromStoredValue } from '@/lib/galleryImageUrl';
import { supabase } from '@/lib/supabase';

function isRpcNotDeployed(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return (
    m.includes('could not find the function') ||
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    (m.includes('function') && m.includes('not found'))
  );
}

async function removeGalleryObject(imageUrl: string | null): Promise<void> {
  const path = getGalleryObjectPathFromStoredValue(imageUrl);
  if (path) {
    await supabase.storage.from('gallery').remove([path]);
  }
}

/** RPC 없을 때만: RLS가 DELETE를 막으면 0행이라 같은 실패처럼 보임 */
async function deleteGalleryPostDirect(args: {
  postId: string;
  deviceId: string;
  imageUrl: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('gallery_posts')
    .delete()
    .eq('id', args.postId)
    .eq('device_id', args.deviceId)
    .select('id');

  if (error) {
    return { ok: false, message: error.message ?? '삭제에 실패했습니다.' };
  }
  if (!data?.length) {
    return {
      ok: false,
      message:
        '삭제 권한이 없거나 서버 설정(RLS) 때문에 삭제되지 않았습니다. Supabase에 delete_gallery_post_for_device 함수가 배포됐는지 확인해 주세요.',
    };
  }
  await removeGalleryObject(args.imageUrl);
  return { ok: true };
}

export async function deleteGalleryPost(args: {
  postId: string;
  deviceId: string;
  imageUrl: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const deviceId = args.deviceId.trim();
  const postId = args.postId.trim();

  const rpc = await supabase.rpc('delete_gallery_post_for_device', {
    p_post_id: postId,
    p_device_id: deviceId,
  });

  if (rpc.error) {
    if (isRpcNotDeployed(rpc.error)) {
      return deleteGalleryPostDirect({ ...args, postId, deviceId });
    }
    return { ok: false, message: rpc.error.message ?? '삭제에 실패했습니다.' };
  }

  if (rpc.data !== true) {
    return {
      ok: false,
      message:
        '이 글을 삭제할 수 없습니다. 이 나눔을 올린 기기에서만 삭제할 수 있어요.',
    };
  }

  await removeGalleryObject(args.imageUrl);
  return { ok: true };
}
