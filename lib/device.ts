import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const REGISTERED_DEVICE_KEY = 'bitsaekim_registered_device_id';
const LEGACY_DEVICE_KEY = 'device_id';

/** IDFV·Android ID 등 이 기기에서 처음 쓰는 ID */
async function getHardwareOrLegacyDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return id;
    } else {
      const id = Application.getAndroidId();
      if (id) return id;
    }
  } catch {
    /* use fallback */
  }

  const stored = await AsyncStorage.getItem(LEGACY_DEVICE_KEY);
  if (stored) return stored;
  const newId = uuidv4();
  await AsyncStorage.setItem(LEGACY_DEVICE_KEY, newId);
  return newId;
}

/** 앱 전역에서 쓰는 device_id (가입 시 저장된 ID 우선). */
export async function getDeviceId(): Promise<string> {
  const registered = await getRegisteredDeviceId();
  if (registered) return registered;
  return getHardwareOrLegacyDeviceId();
}

/** 가입·복구 시 이 기기 ID를 기억해 둡니다 (로그아웃 후에도 「이어서 시작」에 사용). */
export async function rememberRegisteredDeviceId(deviceId: string): Promise<void> {
  if (!deviceId) return;
  await AsyncStorage.setItem(REGISTERED_DEVICE_KEY, deviceId);
  await AsyncStorage.setItem(LEGACY_DEVICE_KEY, deviceId);
}

export async function getRegisteredDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(REGISTERED_DEVICE_KEY);
}

/** 서버에 등록된 계정을 찾을 때 쓸 device_id 후보 */
export async function getDeviceIdCandidates(): Promise<string[]> {
  const { useUserStore } = await import('@/stores/userStore');
  const registered = await getRegisteredDeviceId();
  const fromStore = useUserStore.getState().deviceId;
  const legacy = await AsyncStorage.getItem(LEGACY_DEVICE_KEY);
  const hardware = await getHardwareOrLegacyDeviceId();
  const out: string[] = [];
  for (const id of [registered, fromStore, legacy, hardware]) {
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export async function setSupabaseDeviceId(_deviceId: string): Promise<void> {
  /* set_config RPC 는 연결 풀에서 유지되지 않고 iOS RN 에서 요청이 pending 되는 경우가 있어 호출하지 않습니다.
   * 모든 RPC 는 p_device_id 파라미터로 기기를 식별합니다. */
}
