import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { WorshipDatePickerField } from '@/components/leader/WorshipDatePickerField';
import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatWorshipDateIso } from '@/lib/worshipDate';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export default function CreateWorshipScreen() {
  const c = useThemeColors();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const isGatheringOwner = useMemo(
    () =>
      !!(deviceId && gatheringOwnerDeviceId && deviceId === gatheringOwnerDeviceId),
    [deviceId, gatheringOwnerDeviceId]
  );
  const ownerKnown = gatheringId != null && gatheringOwnerDeviceId != null;
  const isNonOwner = ownerKnown && !isGatheringOwner;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('알림', '예배 이름을 입력해 주세요.');
      return;
    }
    if (!deviceId) {
      Alert.alert('알림', '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.');
      return;
    }
    if (!gatheringId) {
      Alert.alert('알림', '먼저 모임에 참여하거나 모임을 만든 뒤 예배를 만들 수 있어요.');
      return;
    }
    if (isNonOwner) {
      Alert.alert('알림', '이 모임의 예배 목록은 모임장만 만들 수 있어요.');
      return;
    }
    setLoading(true);
    try {
      const { data: worshipId, error } = await supabase.rpc('insert_worship_for_leader', {
        p_name: trimmed,
        p_service_date: formatWorshipDateIso(date),
        p_creator_id: deviceId,
        p_gathering_id: gatheringId,
      });
      if (error) {
        Alert.alert('오류', error.message ?? '예배를 만들지 못했습니다.');
        return;
      }
      if (typeof worshipId !== 'string' || worshipId.length === 0) {
        Alert.alert('오류', '예배를 만들지 못했습니다.');
        return;
      }
      await qc.invalidateQueries({ queryKey: ['worships'] });
      void qc.invalidateQueries({ queryKey: ['setlists-bulk'] });
      void qc.invalidateQueries({ queryKey: ['leader-my-worships'] });
      router.replace(`/leader/worship/${worshipId}/conti`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!gatheringOwnerDeviceId && gatheringId ? (
        <Text style={[styles.hint, { color: c.textSub }]}>
          모임 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.
        </Text>
      ) : null}
      {isNonOwner ? (
        <Text style={[styles.hint, { color: c.textSub }]}>
          예배 이름·날짜로 콘티를 만드는 것은 이 모임의 모임장만 할 수 있어요.
        </Text>
      ) : null}

      <Text style={[styles.label, { color: c.textSub }]}>예배 이름 *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="예: 4월 둘째 주"
        placeholderTextColor={c.textSub}
        style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
        autoCorrect={false}
        autoCapitalize="sentences"
      />

      <Text style={[styles.label, { color: c.textSub }]}>날짜 *</Text>
      <WorshipDatePickerField value={date} onChange={setDate} />

      <Button
        title="저장 후 콘티 편성"
        onPress={submit}
        loading={loading}
        disabled={loading || isNonOwner || (!!gatheringId && !ownerKnown)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  hint: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginBottom: 4 },
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
