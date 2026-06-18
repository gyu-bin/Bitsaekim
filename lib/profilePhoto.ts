import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

function profileFilePath(deviceId: string): string {
  const safe = deviceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}profile-${safe}.jpg`;
}

export function resolveProfilePhotoUri(storedUri: string | null | undefined): string | null {
  if (!storedUri?.trim()) return null;
  return storedUri.startsWith('file://') ? storedUri : `file://${storedUri}`;
}

/** 앨범에서 프로필 사진을 고르고 기기에 저장합니다. */
export async function pickAndSaveProfilePhoto(deviceId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      '사진 접근',
      '프로필 사진을 설정하려면 사진 라이브러리 접근이 필요해요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: () => void Linking.openSettings() },
      ]
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 480 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );

  const dest = profileFilePath(deviceId);
  if (Platform.OS !== 'web') {
    await FileSystem.copyAsync({ from: compressed.uri, to: dest });
    return dest;
  }
  return compressed.uri;
}

export async function removeProfilePhotoFile(deviceId: string): Promise<void> {
  const path = profileFilePath(deviceId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

/** 저장된 URI가 실제 파일인지 확인 */
export async function profilePhotoExists(uri: string | null | undefined): Promise<boolean> {
  if (!uri || Platform.OS === 'web') return !!uri;
  const fileUri = resolveProfilePhotoUri(uri);
  if (!fileUri) return false;
  const info = await FileSystem.getInfoAsync(fileUri);
  return info.exists && !info.isDirectory;
}
