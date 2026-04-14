import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';

import { uploadGalleryJpegFromUri } from '@/lib/image';
import { supabase } from '@/lib/supabase';

export type InsertGalleryPostArgs = {
  deviceId: string;
  worshipId: string | null;
  songId: string | null;
  /** file:// 또는 절대 경로 JPEG */
  localFileUri: string;
  /** 묵상·느낀 점 (선택) */
  body?: string | null;
};

type RowInsert = {
  id: string;
  device_id: string;
  worship_id: string | null;
  song_id: string | null;
  image_url: string | null;
  body: string | null;
  link_url: string | null;
  lyrics_share: string | null;
};

async function insertGalleryRow(row: RowInsert): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('insert_gallery_post_for_device', {
    p_post_id: row.id,
    p_device_id: row.device_id,
    p_worship_id: row.worship_id,
    p_song_id: row.song_id,
    p_image_url: row.image_url,
    p_body: row.body,
    p_link_url: row.link_url,
    p_lyrics_share: row.lyrics_share,
  });
  if (error) {
    return { ok: false, message: error.message ?? '나눔 등록에 실패했습니다.' };
  }
  return { ok: true };
}

/** 스토리지에 이미 올린 공개 URL로 나눔 행만 등록 (compose 화면 등, RLS 우회 RPC) */
export async function insertGalleryPostAfterUpload(args: {
  postId: string;
  deviceId: string;
  worshipId: string | null;
  songId: string | null;
  imagePublicUrl: string;
  body: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return insertGalleryRow({
    id: args.postId,
    device_id: args.deviceId,
    worship_id: args.worshipId,
    song_id: args.songId,
    image_url: args.imagePublicUrl,
    body: args.body,
    link_url: null,
    lyrics_share: null,
  });
}

/** 로컬 JPEG 업로드 + 나눔 글 (필사 완료 시트 등) */
export async function insertGalleryPostWithLocalImage(
  args: InsertGalleryPostArgs
): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  const postId = uuidv4();
  const uri = args.localFileUri.startsWith('file://')
    ? args.localFileUri
    : `file://${args.localFileUri}`;
  const publicUrl = await uploadGalleryJpegFromUri(args.deviceId, postId, uri);
  if (!publicUrl) {
    return { ok: false, message: '이미지를 올리지 못했습니다. 네트워크를 확인해 주세요.' };
  }
  const trimmed = args.body?.trim();
  const res = await insertGalleryRow({
    id: postId,
    device_id: args.deviceId,
    worship_id: args.worshipId,
    song_id: args.songId,
    image_url: publicUrl,
    body: trimmed && trimmed.length > 0 ? trimmed : null,
    link_url: null,
    lyrics_share: null,
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, postId };
}

function isRpcMissing(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return (
    m.includes('could not find the function') ||
    m.includes('schema cache') ||
    m.includes('does not exist')
  );
}

/** 필사 완료 후 자동 나눔에 묵상만 덧붙일 때 (같은 글의 body 갱신) */
export async function updateGalleryPostBody(args: {
  postId: string;
  deviceId: string;
  body: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = args.body?.trim();
  const body = trimmed && trimmed.length > 0 ? trimmed : null;
  const deviceId = args.deviceId.trim();

  const rpc = await supabase.rpc('update_gallery_post_body_for_device', {
    p_post_id: args.postId,
    p_device_id: deviceId,
    p_body: body ?? '',
  });

  if (!rpc.error && rpc.data === true) {
    return { ok: true };
  }

  if (rpc.error && !isRpcMissing(rpc.error)) {
    return { ok: false, message: rpc.error.message ?? '묵상을 저장하지 못했습니다.' };
  }

  const { data, error } = await supabase
    .from('gallery_posts')
    .update({ body })
    .eq('id', args.postId)
    .eq('device_id', deviceId)
    .select('id');
  if (error) {
    return { ok: false, message: error.message ?? '묵상을 저장하지 못했습니다.' };
  }
  if (!data?.length) {
    return { ok: false, message: '글을 찾을 수 없거나 수정 권한이 없습니다.' };
  }
  return { ok: true };
}

/** 나눔에 이미 공개된 이미지 URL을 받아 새 나눔 글로 한 번 더 올립니다(새 파일로 저장). */
export async function insertGalleryDuplicateFromSourceUrl(args: {
  deviceId: string;
  worshipId: string | null;
  songId: string | null;
  sourcePublicUrl: string;
  body?: string | null;
}): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    return { ok: false, message: '임시 저장 경로를 쓸 수 없습니다.' };
  }
  const tmp = `${base}dup-${uuidv4()}.jpg`;
  try {
    const dl = await FileSystem.downloadAsync(args.sourcePublicUrl, tmp);
    if (dl.status !== 200) {
      return { ok: false, message: '이미지를 받아오지 못했습니다.' };
    }
    return await insertGalleryPostWithLocalImage({
      deviceId: args.deviceId,
      worshipId: args.worshipId,
      songId: args.songId,
      localFileUri: dl.uri,
      body: args.body ?? undefined,
    });
  } catch {
    return { ok: false, message: '이미지를 준비하지 못했습니다.' };
  } finally {
    try {
      await FileSystem.deleteAsync(tmp, { idempotent: true });
    } catch {
      /* noop */
    }
  }
}

export type InsertGalleryShareArgs = {
  deviceId: string;
  worshipId: string | null;
  songId: string | null;
  /** 이미 스토리지에 올린 공개 URL (앨범에서 고른 경우) */
  imagePublicUrl?: string | null;
  body?: string | null;
  link_url?: string | null;
  lyrics_share?: string | null;
  /** `pickAndUploadImage` 와 같은 id로 스토리지에 올린 경우 */
  postId?: string;
};

/** 찬양·링크·가사·묵상 나눔 (이미지 선택) */
export async function insertGallerySharePost(
  args: InsertGalleryShareArgs
): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  const postId = args.postId ?? uuidv4();
  const body = args.body?.trim() || null;
  const link = args.link_url?.trim() || null;
  const lyrics = args.lyrics_share?.trim() || null;
  const img = args.imagePublicUrl?.trim() || null;
  if (!img && !link && !lyrics && !body) {
    return { ok: false, message: '사진·링크·가사·묵상 중 하나는 입력해 주세요.' };
  }
  const res = await insertGalleryRow({
    id: postId,
    device_id: args.deviceId,
    worship_id: args.worshipId,
    song_id: args.songId,
    image_url: img,
    body,
    link_url: link,
    lyrics_share: lyrics,
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, postId };
}
