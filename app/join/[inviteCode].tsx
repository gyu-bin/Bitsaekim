import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, typeface } from '@/constants/fonts';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type RpcJoinRow = {
  gathering_id: string;
  gathering_name: string;
  invite_code: string;
  created_by?: string;
};

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

function normalizeInviteParam(raw: string | string[] | undefined): string {
  if (raw == null) return '';
  const s = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  } catch {
    return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }
}

/**
 * 딥링크: bitsaekim://join/{초대코드}
 * 이름·온보딩 전 → 온보딩(코드 전달). 온보딩 완료·모임 없음 → RPC로 바로 참여.
 */
export default function JoinInviteDeepLinkScreen() {
  const { inviteCode: inviteParam } = useLocalSearchParams<{ inviteCode: string }>();
  const code = normalizeInviteParam(inviteParam);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const isOnboarded = useUserStore((s) => s.isOnboarded);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const deviceId = useUserStore((s) => s.deviceId);
  const name = useUserStore((s) => s.name);
  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const joinLock = useRef(false);

  useEffect(() => {
    if (!code) {
      Alert.alert('알림', '유효한 초대 코드가 없습니다.', [
        { text: '확인', onPress: () => router.replace('/onboarding' as Href) },
      ]);
      return;
    }

    if (!isOnboarded || !name) {
      router.replace({
        pathname: '/onboarding',
        params: { invite: code },
      } as Href);
      return;
    }

    if (gatheringId) {
      router.replace('/(tabs)/transcribe' as Href);
      return;
    }

    if (!deviceId) {
      router.replace({
        pathname: '/onboarding',
        params: { invite: code },
      } as Href);
      return;
    }

    if (joinLock.current) return;
    joinLock.current = true;

    let cancelled = false;
    setStatus('joining');

    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setStatus('error');
          setMessage('앱 설정(Supabase)을 확인해 주세요.');
        }
        return;
      }
      try {
        const { data, error } = await supabase.rpc('join_gathering_by_code', {
          p_device_id: deviceId,
          p_invite_code: code,
        });
        if (error) throw error;
        const row = firstRow<RpcJoinRow>(data);
        if (!row?.gathering_id) throw new Error('no row');
        if (cancelled) return;
        useUserStore.getState().setGathering(
          row.gathering_id,
          row.gathering_name,
          row.invite_code,
          row.created_by ?? null
        );
        await qc.invalidateQueries({ queryKey: ['worships'] });
        router.replace('/(tabs)/transcribe');
      } catch (e) {
        if (cancelled) return;
        joinLock.current = false;
        const msg =
          e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
            ? e.message
            : '모임에 들어가지 못했습니다.';
        setStatus('error');
        setMessage(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, deviceId, gatheringId, isOnboarded, name, qc]);

  if (status === 'error') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.errTitle}>연결 실패</Text>
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color="#d4b87c" />
      <Text style={styles.text}>모임에 연결하는 중…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#141008',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 16,
    textAlign: 'center',
  },
  errTitle: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
    color: '#f0ece4',
    marginBottom: 8,
  },
});
