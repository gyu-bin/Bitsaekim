import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type RpcJoinRow = {
  gathering_id: string;
  gathering_name: string;
  invite_code: string;
  /** SQL 010 이후. 없으면 앱에서 `get_gathering_owner_for_member` 로 채움 */
  created_by?: string;
};

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

export default function JoinGatheringScreen() {
  const insets = useSafeAreaInsets();
  const deviceId = useUserStore((s) => s.deviceId);
  const name = useUserStore((s) => s.name);
  const role = useUserStore((s) => s.role);
  const setRole = useUserStore((s) => s.setRole);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const submit = async () => {
    const trimmed = code.trim().toUpperCase().replace(/\s/g, '');
    if (!trimmed) {
      Alert.alert('알림', '초대 코드를 입력해 주세요.');
      return;
    }
    if (!deviceId || !name) {
      Alert.alert('알림', '이름·기기 정보가 없습니다. 처음부터 다시 시작해 주세요.');
      router.replace('/onboarding');
      return;
    }
    if (!isSupabaseConfigured()) {
      Alert.alert('설정 필요', 'Supabase 환경 변수를 확인해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('join_gathering_by_code', {
        p_device_id: deviceId,
        p_invite_code: trimmed,
      });
      if (error) {
        Alert.alert('오류', error.message ?? '코드를 확인할 수 없습니다.');
        return;
      }
      const row = firstRow<RpcJoinRow>(data);
      if (!row?.gathering_id) {
        Alert.alert('오류', '모임에 참여하지 못했습니다.');
        return;
      }
      useUserStore.getState().setGathering(
        row.gathering_id,
        row.gathering_name,
        row.invite_code,
        row.created_by ?? null
      );
      router.replace('/(tabs)/transcribe');
    } finally {
      setBusy(false);
    }
  };

  const goCreateGathering = async () => {
    if (!deviceId || !name) {
      Alert.alert('알림', '이름·기기 정보가 없습니다. 처음부터 다시 시작해 주세요.');
      router.replace('/onboarding');
      return;
    }
    if (!isSupabaseConfigured()) {
      Alert.alert('설정 필요', 'Supabase 환경 변수를 확인해 주세요.');
      return;
    }
    setCreateBusy(true);
    try {
      if (role !== 'leader') {
        const { error } = await supabase.rpc('set_user_role', {
          p_device_id: deviceId,
          p_role: 'leader',
        });
        if (error) {
          Alert.alert('오류', error.message ?? '인도자 전환에 실패했습니다.');
          return;
        }
        setRole('leader');
      }
      router.push('/leader/gathering/create' as Href);
    } finally {
      setCreateBusy(false);
    }
  };

  const pad = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <KeyboardAvoidingView
      style={[styles.root, pad]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>모임 참여</Text>
        <Text style={styles.sub}>
          모임마다 코드가 다릅니다 (예: 헵시바 모임, 싱더글로리 모임). 아래에 코드를 입력하거나, 인도자가 보낸{' '}
          <Text style={styles.subEm}>초대 링크</Text>를 눌러 들어온 경우 이 화면을 건너뛸 수 있어요.
        </Text>

        <Text style={styles.label}>초대 코드</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="8자리 코드"
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
        />

        <Button
          title="참여하기"
          onPress={() => void submit()}
          loading={busy}
          disabled={busy || createBusy || !code.trim()}
          containerStyle={styles.btn}
        />

        <Text style={styles.divider}>또는</Text>
        <Pressable
          onPress={() => void goCreateGathering()}
          disabled={createBusy || busy}
          style={({ pressed }) => [
            styles.linkBtn,
            (pressed || createBusy) && { opacity: createBusy ? 0.65 : 0.85 },
          ]}
        >
          <Text style={styles.linkBtnText}>
            {createBusy ? '준비 중…' : '새 모임 만들기'}
          </Text>
        </Pressable>
        <Text style={styles.hintSmall}>
          코드로 들어오거나, 직접 모임을 열어 초대 코드를 나눌 수 있어요. 새 모임은 이 기기가 모임장이 됩니다.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#141008' },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  title: {
    ...typeface.serifBold,
    fontSize: 28,
    color: '#fff',
    marginBottom: 10,
  },
  sub: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
    marginBottom: 28,
  },
  subEm: { ...typeface.sansMedium, color: palette.gold },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
  },
  input: {
    ...typeface.sans,
    fontSize: 17,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    marginBottom: 20,
  },
  btn: { backgroundColor: palette.gold },
  divider: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginVertical: 16,
  },
  linkBtn: {
    borderWidth: 1,
    borderColor: palette.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnText: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    color: palette.gold,
  },
  hintSmall: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    lineHeight: 18,
  },
});
