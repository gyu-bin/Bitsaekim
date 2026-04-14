import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { buildGatheringInviteUrl } from '@/lib/gatheringInviteLink';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type RpcGatheringRow = { id: string; name: string; invite_code: string; created_by?: string };

function firstRow<T>(data: unknown): T | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (typeof data === 'object') return data as T;
  return undefined;
}

export default function LeaderCreateGatheringScreen() {
  const c = useThemeColors();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const [gatheringName, setGatheringName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = gatheringName.trim();
    if (!trimmed) {
      Alert.alert('알림', '모임 이름을 입력해 주세요.');
      return;
    }
    if (!deviceId) {
      Alert.alert('알림', '기기 정보가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_gathering_for_leader', {
        p_device_id: deviceId,
        p_gathering_name: trimmed,
      });
      if (error) {
        Alert.alert('오류', error.message ?? '모임을 만들지 못했습니다.');
        return;
      }
      const row = firstRow<RpcGatheringRow>(data);
      if (!row?.id || !row.invite_code) {
        Alert.alert('오류', '모임을 만들지 못했습니다.');
        return;
      }
      useUserStore.getState().setGathering(row.id, row.name, row.invite_code, row.created_by ?? deviceId);
      await qc.invalidateQueries({ queryKey: ['worships'] });
      const inviteUrl = buildGatheringInviteUrl(row.invite_code);
      const msg = `모임: ${row.name}\n코드: ${row.invite_code}\n\n아래 링크를 열면 이 모임으로 바로 들어옵니다.\n${inviteUrl}`;
      Alert.alert('모임이 만들어졌어요', msg, [
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
        { text: '확인', onPress: () => router.replace('/(tabs)/transcribe') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.help, { color: c.textSub }]}>
        인도자 권한이 있는 사람이 모임을 엽니다. 초대 링크를 공유하면 참여자가 탭 한 번으로 같은 모임에 들어옵니다.
        초대 코드만 알려줘도 됩니다.
      </Text>
      <Text style={[styles.label, { color: c.textSub }]}>모임 이름 *</Text>
      <TextInput
        value={gatheringName}
        onChangeText={setGatheringName}
        placeholder="예: 헵시바 모임"
        placeholderTextColor={c.textSub}
        style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
        autoCorrect={false}
        autoCapitalize="sentences"
      />
      <Button title="모임 만들기" onPress={() => void submit()} loading={loading} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  help: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginBottom: 12 },
  label: { ...typeface.sansMedium, fontSize: fontSize.sm, marginTop: 8 },
  input: {
    ...typeface.sans,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
});
