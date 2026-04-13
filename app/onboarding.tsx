import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { getDeviceId, setSupabaseDeviceId } from '@/lib/device';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type WebInputProps = {
  nameRef: React.MutableRefObject<string>;
  prevHasRef: React.MutableRefObject<boolean>;
  setCanStart: (v: boolean) => void;
};

/** Expo Web: RN TextInput 조합 깨짐 회피 — 브라우저 네이티브 input */
function WebNameInput({ nameRef, prevHasRef, setCanStart }: WebInputProps) {
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
    marginBottom: 24,
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
        setCanStart(has);
      }
    },
  });
}

export default function OnboardingScreen() {
  const nameRef = useRef('');
  const prevHasRef = useRef(false);
  const [canStart, setCanStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const onNameChange = useCallback((text: string) => {
    nameRef.current = text;
    const has = text.trim().length > 0;
    if (has !== prevHasRef.current) {
      prevHasRef.current = has;
      // 조합 중 setState와 겹치면 IME가 끊길 수 있어 다음 프레임으로 미룸
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCanStart(has));
      });
    }
  }, []);

  const handleStart = async () => {
    const name = nameRef.current.trim();
    if (!name) return;
    if (!isSupabaseConfigured()) {
      Alert.alert(
        '설정 필요',
        'Supabase URL·키가 없습니다. .env에 EXPO_PUBLIC_SUPABASE_* 또는 VITE_SUPABASE_*를 넣은 뒤 Metro를 다시 시작해 주세요.'
      );
      return;
    }
    setBusy(true);
    try {
      const deviceId = await getDeviceId();
      await setSupabaseDeviceId(deviceId);
      const { error } = await supabase.from('users').upsert({
        device_id: deviceId,
        name,
        role: 'user',
      });
      if (error) throw error;
      useUserStore.getState().setUser(deviceId, name);
      useUserStore.getState().setOnboarded();
      router.replace('/(tabs)/transcribe');
    } catch {
      Alert.alert('오류', '서버에 연결할 수 없습니다. 환경 변수와 네트워크를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const insetPad = { paddingTop: insets.top, paddingBottom: insets.bottom };

  const fields = (
    <>
      <Text style={styles.mark}>✦</Text>
      <Text style={styles.title}>빛새김</Text>
      <Text style={styles.sub}>빛 가운데 새기는 찬양</Text>

      <Text style={styles.fieldLabel}>이름</Text>
      {Platform.OS === 'web' ? (
        <WebNameInput nameRef={nameRef} prevHasRef={prevHasRef} setCanStart={setCanStart} />
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
          returnKeyType="done"
          clearButtonMode="while-editing"
        />
      )}

      <Button
        title="시작하기"
        onPress={handleStart}
        loading={busy}
        disabled={!canStart}
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
    fontFamily: fonts.serifBold,
    fontSize: 48,
    color: '#fff',
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: palette.gold,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
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
    color: '#fff',
    marginBottom: 24,
  },
  btn: { backgroundColor: palette.gold },
});
