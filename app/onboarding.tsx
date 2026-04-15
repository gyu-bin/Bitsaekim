import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';
import { typeface } from '@/constants/fonts';
import { getDeviceId, setSupabaseDeviceId } from '@/lib/device';
import { buildGatheringInviteUrl } from '@/lib/gatheringInviteLink';
import { isSupabaseConfigured, supabase, supabaseMissingConfigUserMessage } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type Flow = 'join' | 'create';

type WebNameInputProps = {
  nameRef: React.MutableRefObject<string>;
  prevHasRef: React.MutableRefObject<boolean>;
  onNameTyped: () => void;
};

/** Expo Web: RN TextInput 조합 깨짐 회피 — 브라우저 네이티브 input */
function WebNameInput({ nameRef, prevHasRef, onNameTyped }: WebNameInputProps) {
  const style: CSSProperties = {
    alignSelf: 'stretch',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 52,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 17,
    color: '#fff',
    marginBottom: 16,
    outline: 'none',
  };

  return React.createElement('input', {
    type: 'text',
    lang: 'ko',
    autoComplete: 'off',
    spellCheck: false,
    placeholder: '이름을 입력하세요',
    defaultValue: '',
    style,
    onInput: (e: React.FormEvent<HTMLInputElement>) => {
      const text = e.currentTarget.value;
      nameRef.current = text;
      const has = text.trim().length > 0;
      if (has !== prevHasRef.current) {
        prevHasRef.current = has;
      }
      onNameTyped();
    },
  });
}

type RpcJoinRow = {
  gathering_id: string;
  gathering_name: string;
  invite_code: string;
  created_by?: string;
};
type RpcCreateRow = { id: string; name: string; invite_code: string; created_by?: string };

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

export default function OnboardingScreen() {
  const { invite: inviteParam } = useLocalSearchParams<{ invite?: string }>();
  const nameRef = useRef('');
  const prevHasRef = useRef(false);
  const [flow, setFlow] = useState<Flow>('join');
  const [inviteCode, setInviteCode] = useState('');
  const [gatheringName, setGatheringName] = useState('');
  const [canStart, setCanStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const syncCanStart = useCallback(() => {
    const hasName = nameRef.current.trim().length > 0;
    const extra =
      flow === 'join' ? inviteCode.trim().length > 0 : gatheringName.trim().length > 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCanStart(hasName && extra));
    });
  }, [flow, inviteCode, gatheringName]);

  const onNameChange = useCallback(
    (text: string) => {
      nameRef.current = text;
      const has = text.trim().length > 0;
      if (has !== prevHasRef.current) {
        prevHasRef.current = has;
      }
      syncCanStart();
    },
    [syncCanStart]
  );

  useEffect(() => {
    syncCanStart();
  }, [flow, inviteCode, gatheringName, syncCanStart]);

  useEffect(() => {
    const raw = typeof inviteParam === 'string' ? inviteParam : Array.isArray(inviteParam) ? inviteParam[0] : '';
    const n = raw?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) ?? '';
    if (n) {
      setInviteCode(n);
      setFlow('join');
    }
  }, [inviteParam]);

  const handleStart = async () => {
    const name = nameRef.current.trim();
    if (!name) return;
    if (!isSupabaseConfigured()) {
      Alert.alert('설정 필요', supabaseMissingConfigUserMessage());
      return;
    }
    setBusy(true);
    try {
      const deviceId = await getDeviceId();
      await setSupabaseDeviceId(deviceId);

      if (flow === 'join') {
        const code = inviteCode.trim().toUpperCase().replace(/\s/g, '');
        if (!code) return;
        const { error: userErr } = await supabase.from('users').upsert({
          device_id: deviceId,
          name,
          role: 'user',
        });
        if (userErr) throw userErr;

        const { data, error } = await supabase.rpc('join_gathering_by_code', {
          p_device_id: deviceId,
          p_invite_code: code,
        });
        if (error) throw error;
        const row = firstRow<RpcJoinRow>(data);
        if (!row?.gathering_id) throw new Error('no row');

        useUserStore.getState().setUser(deviceId, name, 'user');
        useUserStore.getState().setRole('user');
        useUserStore.getState().setGathering(
          row.gathering_id,
          row.gathering_name,
          row.invite_code,
          row.created_by ?? null
        );
        useUserStore.getState().setOnboarded();
        router.replace('/(tabs)/transcribe');
      } else {
        const gname = gatheringName.trim();
        if (!gname) return;
        const { error: userErr } = await supabase.from('users').upsert({
          device_id: deviceId,
          name,
          role: 'leader',
        });
        if (userErr) throw userErr;

        const { data, error } = await supabase.rpc('create_gathering_for_leader', {
          p_device_id: deviceId,
          p_gathering_name: gname,
        });
        if (error) throw error;
        const row = firstRow<RpcCreateRow>(data);
        if (!row?.id) throw new Error('no row');

        useUserStore.getState().setUser(deviceId, name, 'leader');
        useUserStore.getState().setRole('leader');
        useUserStore.getState().setGathering(row.id, row.name, row.invite_code, row.created_by ?? deviceId);
        useUserStore.getState().setOnboarded();
        const inviteUrl = buildGatheringInviteUrl(row.invite_code);
        const msg = `모임: ${row.name}\n초대 코드: ${row.invite_code}\n\n초대 링크(탭하면 참여):\n${inviteUrl}`;
        Alert.alert('모임이 열렸어요', msg, [
          {
            text: '코드 복사',
            onPress: () =>
              void (async () => {
                await Clipboard.setStringAsync(row.invite_code);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              })(),
          },
          {
            text: '링크 공유',
            onPress: () =>
              void Share.share({
                message: `${row.name} 모임에 초대합니다.\n코드: ${row.invite_code}\n\n앱에서 열기: ${inviteUrl}`,
              }),
          },
          { text: '시작하기', onPress: () => router.replace('/(tabs)/transcribe') },
        ]);
      }
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
          ? e.message
          : '서버에 연결할 수 없습니다. 환경 변수와 네트워크를 확인해 주세요.';
      Alert.alert('오류', msg);
    } finally {
      setBusy(false);
    }
  };

  const insetPad = { paddingTop: insets.top, paddingBottom: insets.bottom };

  const flowToggle = (
    <View style={styles.flowRow}>
      <Pressable
        onPress={() => setFlow('join')}
        style={[styles.flowChip, flow === 'join' && styles.flowChipOn]}
      >
        <Text style={[styles.flowChipText, flow === 'join' && styles.flowChipTextOn]}>초대로 참여</Text>
      </Pressable>
      <Pressable
        onPress={() => setFlow('create')}
        style={[styles.flowChip, flow === 'create' && styles.flowChipOn]}
      >
        <Text style={[styles.flowChipText, flow === 'create' && styles.flowChipTextOn]}>
          인도자 — 모임 열기
        </Text>
      </Pressable>
    </View>
  );

  const fields = (
    <>
      <Text style={styles.mark}>✦</Text>
      <Text style={styles.title}>빛새김</Text>
      <Text style={styles.sub}>빛 가운데 새기는 찬양</Text>

      {flowToggle}

      <Text style={styles.fieldLabel}>이름</Text>
      {Platform.OS === 'web' ? (
        <WebNameInput nameRef={nameRef} prevHasRef={prevHasRef} onNameTyped={syncCanStart} />
      ) : (
        <TextInput
          accessibilityLabel="이름 입력"
          placeholder="이름을 입력하세요"
          placeholderTextColor="rgba(255,255,255,0.45)"
          defaultValue=""
          onChangeText={onNameChange}
          style={styles.input}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          keyboardType="default"
          textContentType="none"
          importantForAutofill="no"
          multiline={false}
          returnKeyType="next"
          clearButtonMode="while-editing"
        />
      )}

      {flow === 'join' ? (
        <>
          <Text style={styles.fieldLabel}>모임 초대 코드</Text>
          <TextInput
            accessibilityLabel="초대 코드 입력"
            placeholder="예: A1B2C3D4"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase().replace(/\s/g, ''))}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />
          <Text style={styles.hint}>
            <Text style={styles.hintEm}>인도자가 보낸 링크</Text>로 들어왔다면 코드가 이미 채워져 있을 수 있어요. 없으면
            인도자에게 코드나 링크를 요청해 주세요.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>모임 이름</Text>
          <TextInput
            accessibilityLabel="모임 이름 입력"
            placeholder="예: 헵시바 모임, 싱더글로리 모임"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={gatheringName}
            onChangeText={setGatheringName}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="sentences"
          />
          <Text style={styles.hint}>
            여기서 만든 모임에만 예배·콘티가 보입니다. 시작 후 마이페이지에서도 초대 코드를 볼 수 있어요.
          </Text>
        </>
      )}

      <Button
        title={flow === 'join' ? '모임에 참여하고 시작' : '모임 만들고 시작'}
        onPress={() => void handleStart()}
        loading={busy}
        disabled={!canStart || busy}
        containerStyle={styles.btn}
      />
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, insetPad]}>
        <View style={styles.inner}>{fields}</View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, insetPad]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>{fields}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#141008',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  mark: {
    fontSize: 48,
    color: palette.gold,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    ...typeface.serifBold,
    fontSize: 48,
    color: '#fff',
    textAlign: 'center',
  },
  sub: {
    ...typeface.sans,
    fontSize: 14,
    color: palette.gold,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  flowChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  flowChipOn: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(212, 184, 124, 0.15)',
  },
  flowChipText: {
    ...typeface.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  flowChipTextOn: {
    color: palette.gold,
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    ...typeface.sans,
    color: '#fff',
    marginBottom: 12,
  },
  hint: {
    ...typeface.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    marginBottom: 16,
  },
  hintEm: { ...typeface.sansMedium, color: 'rgba(255,255,255,0.75)' },
  btn: { backgroundColor: palette.gold, marginTop: 8 },
});
