import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

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

  const fileName = `${deviceId}/${postId}.jpg`;
  const response = await fetch(compressed.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('gallery')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
  return data.publicUrl;
}
