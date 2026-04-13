import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/lib/supabase';

export async function getDeviceId(): Promise<string> {
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

  const stored = await AsyncStorage.getItem('device_id');
  if (stored) return stored;
  const newId = uuidv4();
  await AsyncStorage.setItem('device_id', newId);
  return newId;
}

export async function setSupabaseDeviceId(deviceId: string): Promise<void> {
  if (!deviceId) return;
  try {
    await supabase.rpc('set_config', { p_key: 'app.device_id', p_value: deviceId });
  } catch {
    /* RPC가 없거나 풀 연결에서 설정이 유지되지 않을 수 있음 — Supabase에서 RLS 튜닝 필요 */
  }
}
