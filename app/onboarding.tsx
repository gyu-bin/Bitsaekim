import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { OnboardingIntroSlides } from '@/components/onboarding/OnboardingIntroSlides';
import { WebNativeTextInput } from '@/components/ui/WebNativeTextInput';
import { palette, radius } from '@/constants/colors';
import { typeface } from '@/constants/fonts';
import { getDeviceId, rememberRegisteredDeviceId } from '@/lib/device';
import { buildGatheringInviteUrl } from '@/lib/gatheringInviteLink';
import { hasSeenOnboardingIntro, markOnboardingIntroSeen } from '@/lib/onboardingIntro';
import { applyRecoveryCodeSession } from '@/lib/recoveryCode';
import { isInvalidInviteCodeError } from '@/lib/joinGathering';
import { registerUserForDevice } from '@/lib/registerUser';
import {
  applyRestoredSession,
  probeExistingSession,
  type RestoredSession,
} from '@/lib/restoreSession';
import {
  formatSupabaseNetworkError,
  isSupabaseConfigured,
  supabase,
  supabaseMissingConfigUserMessage,
} from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { showToast } from '@/stores/toastStore';

type Flow = 'solo' | 'join' | 'create' | 'recover';

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
  const gatheringNameRef = useRef('');
  const prevHasRef = useRef(false);
  const [flow, setFlow] = useState<Flow>('solo');
  const [inviteCode, setInviteCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [canStart, setCanStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existingSession, setExistingSession] = useState<RestoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(false);
  const sessionProbeRef = useRef(0);
  const initialProbeDone = useRef(false);
  const [storeHydrated, setStoreHydrated] = useState(() => useUserStore.persist.hasHydrated());
  const [introPhase, setIntroPhase] = useState<'loading' | 'slides' | 'form'>('loading');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (useUserStore.persist.hasHydrated()) {
      setStoreHydrated(true);
      return;
    }
    const done = useUserStore.persist.onFinishHydration(() => setStoreHydrated(true));
    return done;
  }, []);

  const loadExistingSession = useCallback(async (): Promise<RestoredSession | null> => {
    const probeId = ++sessionProbeRef.current;

    if (!isSupabaseConfigured()) {
      if (probeId !== sessionProbeRef.current) return null;
      setExistingSession(null);
      setSessionChecking(false);
      setSessionChecked(true);
      return null;
    }

    setSessionChecking(true);
    try {
      const session = await probeExistingSession();
      if (probeId !== sessionProbeRef.current) return null;
      setExistingSession(session);
      return session;
    } catch {
      if (probeId !== sessionProbeRef.current) return null;
      setExistingSession(null);
      return null;
    } finally {
      if (probeId !== sessionProbeRef.current) return null;
      setSessionChecking(false);
      setSessionChecked(true);
    }
  }, []);

  const handleManualProbe = useCallback(async () => {
    await loadExistingSession();
  }, [loadExistingSession]);

  const syncCanStart = useCallback(() => {
    if (flow === 'recover') {
      const ok = recoveryCode.trim().length === 6;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCanStart(ok));
      });
      return;
    }
    const hasName = nameRef.current.trim().length > 0;
    const extra =
      flow === 'solo'
        ? true
        : flow === 'join'
          ? inviteCode.trim().length > 0
          : gatheringNameRef.current.trim().length > 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCanStart(hasName && extra));
    });
  }, [flow, inviteCode, recoveryCode]);

  const onGatheringNameChange = useCallback(
    (text: string) => {
      gatheringNameRef.current = text;
      syncCanStart();
    },
    [syncCanStart]
  );

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
  }, [flow, inviteCode, recoveryCode, syncCanStart]);

  useEffect(() => {
    gatheringNameRef.current = '';
  }, [flow]);

  useEffect(() => {
    const raw = typeof inviteParam === 'string' ? inviteParam : Array.isArray(inviteParam) ? inviteParam[0] : '';
    const n = raw?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) ?? '';
    if (n) {
      setInviteCode(n);
      setFlow('join');
    }
  }, [inviteParam]);

  useEffect(() => {
    void (async () => {
      const raw = typeof inviteParam === 'string' ? inviteParam : Array.isArray(inviteParam) ? inviteParam[0] : '';
      const hasInvite = !!raw?.trim();
      if (hasInvite) {
        setIntroPhase('form');
        return;
      }
      const seen = await hasSeenOnboardingIntro();
      setIntroPhase(seen ? 'form' : 'slides');
    })();
  }, [inviteParam]);

  const finishIntro = useCallback(async () => {
    await markOnboardingIntroSeen();
    setIntroPhase('form');
  }, []);

  useEffect(() => {
    if (!storeHydrated || initialProbeDone.current) return;
    initialProbeDone.current = true;
    void loadExistingSession();
  }, [storeHydrated, loadExistingSession]);

  const handleContinueExisting = async () => {
    if (!existingSession) return;
    setBusy(true);
    try {
      await applyRestoredSession(existingSession);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('오류', formatSupabaseNetworkError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRecover = async () => {
    const code = recoveryCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return;
    if (!isSupabaseConfigured()) {
      Alert.alert('설정 필요', supabaseMissingConfigUserMessage());
      return;
    }
    setBusy(true);
    try {
      const deviceId = await getDeviceId();
      const result = await applyRecoveryCodeSession(code, deviceId);
      if (!result.success) {
        showToast(result.error || '코드를 다시 확인해 주세요', 'error');
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      showToast('코드를 다시 확인해 주세요', 'error');
    } finally {
      setBusy(false);
    }
  };

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

      if (flow === 'solo') {
        const registered = await registerUserForDevice(deviceId, name, 'user');
        useUserStore.getState().setUser(deviceId, registered.name, 'user');
        useUserStore.getState().setRole('user');
        await rememberRegisteredDeviceId(deviceId);
        useUserStore.getState().setOnboarded();
        router.replace('/(tabs)');
        return;
      }

      if (flow === 'join') {
        const code = inviteCode.trim().toUpperCase().replace(/\s/g, '');
        if (!code) return;
        const registered = await registerUserForDevice(deviceId, name, 'user');

        const { data, error } = await supabase.rpc('join_gathering_by_code', {
          p_device_id: deviceId,
          p_invite_code: code,
        });
        if (error) throw error;
        const row = firstRow<RpcJoinRow>(data);
        if (!row?.gathering_id) throw new Error('no row');

        useUserStore.getState().setUser(deviceId, registered.name, 'user');
        useUserStore.getState().setRole('user');
        await rememberRegisteredDeviceId(deviceId);
        useUserStore.getState().setGathering(
          row.gathering_id,
          row.gathering_name,
          row.invite_code,
          row.created_by ?? null
        );
        useUserStore.getState().setOnboarded();
        router.replace('/(tabs)');
      } else {
        const gname = gatheringNameRef.current.trim();
        if (!gname) return;
        const registered = await registerUserForDevice(deviceId, name, 'leader');

        const { data, error } = await supabase.rpc('create_gathering_for_leader', {
          p_device_id: deviceId,
          p_gathering_name: gname,
        });
        if (error) throw error;
        const row = firstRow<RpcCreateRow>(data);
        if (!row?.id) throw new Error('no row');

        useUserStore.getState().setUser(deviceId, registered.name, 'leader');
        useUserStore.getState().setRole('leader');
        await rememberRegisteredDeviceId(deviceId);
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
          { text: '시작하기', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } catch (e) {
      if (flow === 'join' && isInvalidInviteCodeError(e as { message?: string })) {
        showToast((e as { message?: string }).message ?? '초대 코드가 유효하지 않아요', 'error');
      } else {
        Alert.alert('오류', formatSupabaseNetworkError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const insetPad = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (introPhase === 'loading') {
    return (
      <View style={[styles.root, insetPad, styles.introLoading]}>
        <ActivityIndicator size="large" color={palette.gold} />
      </View>
    );
  }

  if (introPhase === 'slides') {
    return <OnboardingIntroSlides onDone={() => void finishIntro()} onSkip={() => void finishIntro()} />;
  }

  const flowToggle = (
    <View style={styles.flowRow}>
      <Pressable
        onPress={() => setFlow('solo')}
        style={[styles.flowChip, flow === 'solo' && styles.flowChipOn]}
      >
        <Text style={[styles.flowChipText, flow === 'solo' && styles.flowChipTextOn]}>혼자 시작</Text>
      </Pressable>
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
          모임 열기
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setFlow('recover')}
        style={[styles.flowChip, flow === 'recover' && styles.flowChipOn]}
      >
        <Text style={[styles.flowChipText, flow === 'recover' && styles.flowChipTextOn]}>
          이어하기
        </Text>
      </Pressable>
    </View>
  );

  const fields = (
    <>
      <Text style={styles.mark}>✦</Text>
      <Text style={styles.title}>빛새김</Text>
      <Text style={styles.sub}>빛 가운데 새기는 찬양</Text>

      {sessionChecking ? (
        <View style={styles.existingCheckingWrap}>
          <ActivityIndicator size="large" color={palette.gold} />
          <Text style={styles.existingChecking}>이 기기에 저장된 정보 확인 중…</Text>
          <Text style={styles.existingCheckingSub}>잠시만 기다려 주세요</Text>
        </View>
      ) : existingSession ? (
        <View style={styles.existingBlock}>
          <Text style={styles.existingTitle}>{existingSession.name}님, 다시 오셨네요</Text>
          <Text style={styles.existingSub}>
            {existingSession.gathering
              ? `모임 · ${existingSession.gathering.name}`
              : '가입은 되어 있어요. 혼자 쓰거나, 나중에 모임에 들어갈 수 있어요.'}
          </Text>
          <Button
            title="이어서 시작하기"
            onPress={() => void handleContinueExisting()}
            loading={busy}
            disabled={busy}
            containerStyle={styles.existingBtn}
          />
          <Text style={styles.existingDivider}>또는 아래에서 새로 시작</Text>
        </View>
      ) : sessionChecked ? (
        <View style={styles.returningBanner}>
          <Text style={styles.returningTitle}>다시 오셨나요?</Text>
          <Text style={styles.returningBody}>
            이 기기에는 자동으로 불러올 정보가 없어요.{'\n'}
            <Text style={styles.returningEm}>복구 코드</Text>가 있다면 「다른 기기에서 이어하기」를 선택하세요.
            없다면 아래에서 이름·초대 코드를 입력해 같은 모임에 다시 들어갈 수 있습니다.
          </Text>
          <Pressable
            style={styles.existingRetry}
            onPress={() => void handleManualProbe()}
            disabled={sessionChecking}
          >
            <Text style={styles.existingRetryText}>이 기기에서 저장 정보 다시 확인</Text>
          </Pressable>
        </View>
      ) : null}

      {flowToggle}

      {flow === 'recover' ? (
        <>
          <Text style={styles.fieldLabel}>복구 코드 (6자리)</Text>
          <TextInput
            accessibilityLabel="복구 코드 입력"
            placeholder="예: A1B2C3"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={recoveryCode}
            onChangeText={(t) =>
              setRecoveryCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
            }
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <Text style={styles.hint}>
            이전 기기의 <Text style={styles.hintEm}>마이페이지</Text>에서 발급한 복구 코드를 입력하세요. 앱을
            재설치하거나 기기를 바꿀 때 사용해요.
          </Text>
          <Button
            title="복구하고 시작"
            onPress={() => void handleRecover()}
            loading={busy}
            disabled={!canStart || busy}
            containerStyle={styles.btn}
          />
        </>
      ) : (
        <>
      <Text style={styles.fieldLabel}>이름</Text>
      {Platform.OS === 'web' ? (
        <WebNativeTextInput
          textRef={nameRef}
          placeholder="이름을 입력하세요"
          onTextChange={syncCanStart}
        />
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

      {flow === 'solo' ? (
        <Text style={styles.hint}>
          이름만 입력하면 바로 필사를 시작할 수 있어요. 모임은 나중에 마이페이지에서 참여하거나 만들 수 있습니다.
        </Text>
      ) : flow === 'join' ? (
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
            <Text style={styles.hintEm}>예전에 가입했어도</Text> 앱을 지웠거나 기기가 바뀌었다면, 이름·초대 코드만
            입력해 같은 모임에 다시 들어가면 됩니다.{' '}
            <Text style={styles.hintEm}>인도자가 보낸 링크</Text>로 들어왔다면 코드가 이미 채워져 있을 수 있어요.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>모임 이름</Text>
          {Platform.OS === 'web' ? (
            <WebNativeTextInput
              key="gathering-name-web"
              textRef={gatheringNameRef}
              placeholder="예: 헵시바 모임, 싱더글로리 모임"
              autoCapitalize="sentences"
              onTextChange={syncCanStart}
            />
          ) : (
            <TextInput
              accessibilityLabel="모임 이름 입력"
              placeholder="예: 헵시바 모임, 싱더글로리 모임"
              placeholderTextColor="rgba(255,255,255,0.45)"
              defaultValue=""
              onChangeText={onGatheringNameChange}
              style={styles.input}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="sentences"
              keyboardType="default"
              textContentType="none"
              importantForAutofill="no"
              returnKeyType="done"
              clearButtonMode="while-editing"
            />
          )}
          <Text style={styles.hint}>
            여기서 만든 모임에만 예배·콘티가 보입니다. 시작 후 마이페이지에서도 초대 코드를 볼 수 있어요.
          </Text>
        </>
      )}

      <Button
        title={
          flow === 'solo'
            ? '시작하기'
            : flow === 'join'
              ? '모임에 참여하고 시작'
              : '모임 만들고 시작'
        }
        onPress={() => void handleStart()}
        loading={busy}
        disabled={!canStart || busy}
        containerStyle={styles.btn}
      />
        </>
      )}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, insetPad]}>
        <View style={styles.glowTop} pointerEvents="none" />
        <View style={styles.inner}>{fields}</View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, insetPad]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.inner}>{fields}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(212, 169, 106, 0.14)',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  mark: {
    fontSize: 40,
    color: palette.gold,
    textAlign: 'center',
    marginBottom: 4,
    opacity: 0.9,
  },
  title: {
    ...typeface.serifBold,
    fontSize: 44,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    ...typeface.sans,
    fontSize: 15,
    color: palette.goldMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  flowChip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flowChipOn: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(184, 147, 90, 0.2)',
  },
  flowChipText: {
    ...typeface.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  flowChipTextOn: {
    color: palette.goldLight,
  },
  existingBlock: {
    marginBottom: 22,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 169, 106, 0.45)',
    backgroundColor: 'rgba(184, 147, 90, 0.12)',
  },
  existingCheckingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 169, 106, 0.35)',
    backgroundColor: 'rgba(184, 147, 90, 0.1)',
    gap: 14,
  },
  existingChecking: {
    ...typeface.serifBold,
    fontSize: 20,
    color: palette.goldLight,
    textAlign: 'center',
  },
  existingCheckingSub: {
    ...typeface.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  existingRetry: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  existingRetryText: {
    ...typeface.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },
  returningBanner: {
    marginBottom: 22,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  returningTitle: {
    ...typeface.serifBold,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  returningBody: {
    ...typeface.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  returningEm: {
    ...typeface.sansMedium,
    color: palette.goldLight,
  },
  existingTitle: {
    ...typeface.serifBold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  existingSub: {
    ...typeface.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  existingBtn: { marginTop: 16 },
  existingDivider: {
    ...typeface.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 14,
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    ...typeface.sansMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    ...typeface.sans,
    color: '#fff',
    marginBottom: 14,
  },
  hint: {
    ...typeface.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
    marginBottom: 18,
  },
  hintEm: { ...typeface.sansMedium, color: 'rgba(255,255,255,0.72)' },
  btn: { marginTop: 10 },
  introLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
