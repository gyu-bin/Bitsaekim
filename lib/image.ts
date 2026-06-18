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

/** 앨범에서 사진만 고릅니다. 업로드·압축 없이 로컬 URI를 바로 반환해 미리보기가 즉시 뜹니다. */
export async function pickGalleryImageUri(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.92,
    exif: false,
    allowsEditing: false,
    // iPad 등에서 사진만 체크되고 끝나는 문제 → 네이티브 피커 상단 「추가」 확인 버튼 노출
    allowsMultipleSelection: true,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

/** 업로드 직전에만 리사이즈·JPEG 압축 */
export async function compressGalleryImageUri(uri: string): Promise<string> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1400 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
  );
  return compressed.uri;
}

/** 로컬 JPEG(file://)를 갤러리 스토리지에 올리고 public URL 반환 */
export async function uploadGalleryJpegFromUri(
  deviceId: string,
  postId: string,
  fileUri: string
): Promise<string | null> {
  const prepared = await compressGalleryImageUri(fileUri);
  const bytes = await readUriAsJpegBytes(prepared);
  if (!bytes) return null;

  const fileName = `${deviceId}/${postId}.jpg`;
  const { error } = await supabase.storage
    .from('gallery')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
  return data.publicUrl;
}

/** 프로필 사진 JPEG를 avatars/{deviceId}.jpg 로 업로드 */
export async function uploadAvatarJpegFromUri(
  deviceId: string,
  fileUri: string
): Promise<string | null> {
  const bytes = await readUriAsJpegBytes(normalizeFileUri(fileUri));
  if (!bytes) return null;

  const fileName = `avatars/${deviceId}.jpg`;
  const { error } = await supabase.storage
    .from('gallery')
    .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
  const cacheBust = Date.now();
  return `${data.publicUrl}?v=${cacheBust}`;
}

/** @deprecated 미리보기 없이 느리게 동작합니다. `pickGalleryImageUri` + `uploadGalleryJpegFromUri` 사용 권장 */
export async function pickAndUploadImage(
  deviceId: string,
  postId: string
): Promise<string | null> {
  const local = await pickGalleryImageUri();
  if (!local) return null;
  return uploadGalleryJpegFromUri(deviceId, postId, local);
}
