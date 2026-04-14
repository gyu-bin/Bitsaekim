import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function normalizeFileUri(uri: string): string {
  const t = uri.trim();
  return t.startsWith('file://') ? t : `file://${t}`;
}

/**
 * 로컬 URI를 업로드용 바이트로 읽습니다.
 * RN에서 `fetch(fileUri).blob()`은 종종 빈 Blob이 되어 Storage에 0바이트가 올라가므로,
 * 네이티브에서는 FileSystem base64 읽기를 사용합니다.
 */
async function readUriAsJpegBytes(uri: string): Promise<Uint8Array | null> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const ab = await blob.arrayBuffer();
      const u8 = new Uint8Array(ab);
      return u8.length > 0 ? u8 : null;
    } catch {
      return null;
    }
  }

  const fileUri = normalizeFileUri(uri);
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory) return null;
  if ('size' in info && typeof info.size === 'number' && info.size === 0) return null;

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

/** 로컬 JPEG(file://)를 갤러리 스토리지에 올리고 public URL 반환 */
export async function uploadGalleryJpegFromUri(
  deviceId: string,
  postId: string,
  fileUri: string
): Promise<string | null> {
  const bytes = await readUriAsJpegBytes(fileUri);
  if (!bytes) return null;

  const fileName = `${deviceId}/${postId}.jpg`;
  const { error } = await supabase.storage
    .from('gallery')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function pickAndUploadImage(
  deviceId: string,
  postId: string
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const bytes = await readUriAsJpegBytes(compressed.uri);
  if (!bytes) return null;

  const fileName = `${deviceId}/${postId}.jpg`;
  const { error } = await supabase.storage
    .from('gallery')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
  return data.publicUrl;
}
