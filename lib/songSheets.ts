import * as ImageManipulator from 'expo-image-manipulator';
import { v4 as uuidv4 } from 'uuid';

import { pickGalleryImageUri, compressGalleryImageUri } from '@/lib/image';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export type SongSheet = {
  id: string;
  song_id: string;
  gathering_id: string | null;
  uploaded_by: string | null;
  image_url: string;
  page_index: number;
  created_at: string;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function readUriAsJpegBytes(uri: string): Promise<Uint8Array | null> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(uri);
      const ab = await res.arrayBuffer();
      const u8 = new Uint8Array(ab);
      return u8.length > 0 ? u8 : null;
    } catch {
      return null;
    }
  }
  const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64?.length) return null;
  try {
    const bytes = base64ToUint8Array(base64);
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

export async function uploadSheetJpegFromUri(
  deviceId: string,
  sheetId: string,
  fileUri: string
): Promise<string | null> {
  const prepared = await compressGalleryImageUri(fileUri);
  const bytes = await readUriAsJpegBytes(prepared);
  if (!bytes) return null;

  const fileName = `${deviceId}/${sheetId}.jpg`;
  const { error } = await supabase.storage
    .from('sheets')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) return null;

  const { data } = supabase.storage.from('sheets').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function pickAndInsertSongSheet(args: {
  deviceId: string;
  songId: string;
  gatheringId: string | null;
  pageIndex?: number;
}): Promise<{ ok: true; sheet: SongSheet } | { ok: false; message: string }> {
  const local = await pickGalleryImageUri();
  if (!local) return { ok: false, message: '이미지를 선택하지 않았어요.' };

  // 악보는 가독성 위해 조금 더 큰 해상도
  const resized = await ImageManipulator.manipulateAsync(
    local,
    [{ resize: { width: 1800 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  const sheetId = uuidv4();
  const publicUrl = await uploadSheetJpegFromUri(args.deviceId, sheetId, resized.uri);
  if (!publicUrl) return { ok: false, message: '악보 업로드에 실패했어요.' };

  const { data, error } = await supabase.rpc('insert_song_sheet_for_device', {
    p_device_id: args.deviceId,
    p_song_id: args.songId,
    p_gathering_id: args.gatheringId,
    p_image_url: publicUrl,
    p_page_index: args.pageIndex ?? 0,
  });

  if (error) return { ok: false, message: error.message ?? '악보 등록에 실패했어요.' };

  return {
    ok: true,
    sheet: {
      id: (data as string) ?? sheetId,
      song_id: args.songId,
      gathering_id: args.gatheringId,
      uploaded_by: args.deviceId,
      image_url: publicUrl,
      page_index: args.pageIndex ?? 0,
      created_at: new Date().toISOString(),
    },
  };
}

export async function deleteSongSheet(deviceId: string, sheetId: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_song_sheet_for_device', {
    p_device_id: deviceId,
    p_sheet_id: sheetId,
  });
  return !error;
}
