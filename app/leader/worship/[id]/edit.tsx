import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { WorshipDatePickerField } from '@/components/leader/WorshipDatePickerField';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatWorshipDateIso, parseWorshipDateIso } from '@/lib/worshipDate';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type WorshipRow = {
  name: string;
  service_date: string;
  gathering_id: string | null;
  creator_id: string;
};

export default function EditWorshipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['worship', id],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('worship_services')
        .select('name, service_date, gathering_id, creator_id')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return row as WorshipRow;
    },
    enabled: !!id,
  });

  const canEdit = useMemo(() => {
    if (!data || !deviceId) return false;
    if (data.gathering_id) {
      if (!gatheringOwnerDeviceId) return false;
      return deviceId === gatheringOwnerDeviceId;
    }
    return data.creator_id === deviceId;
  }, [data, deviceId, gatheringOwnerDeviceId]);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDate(parseWorshipDateIso(data.service_date));
    }
  }, [data]);

  const save = async () => {
    if (!id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('알림', '예배 이름을 입력해 주세요.');
      return;
    }
    if (!deviceId) {
      Alert.alert('알림', '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.');
      return;
    }
    if (!canEdit) {
      Alert.alert('알림', '모임장만 예배 정보를 수정할 수 있어요.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_worship_for_leader', {
        p_worship_id: id,
        p_name: trimmed,
        p_service_date: formatWorshipDateIso(date),
        p_creator_id: deviceId,
      });
      if (error) {
        Alert.alert('오류', error.message ?? '저장하지 못했습니다.');
        return;
      }
      await qc.invalidateQueries({ queryKey: ['leader-my-worships'] });
      await qc.invalidateQueries({ queryKey: ['worships'] });
      void qc.invalidateQueries({ queryKey: ['setlists-bulk'] });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !data) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!canEdit && data.gathering_id ? (
        <Text style={[styles.hint, { color: c.textSub }]}>
          {gatheringOwnerDeviceId
            ? '이 예배의 이름·날짜는 모임장만 바꿀 수 있어요.'
            : '모임 정보를 불러오는 중이에요. 잠시 후 다시 열어 주세요.'}
        </Text>
      ) : null}
      {!canEdit && !data.gathering_id ? (
        <Text style={[styles.hint, { color: c.textSub }]}>
          이 예배는 예전 방식으로 올라와 있어, 만든 기기에서만 수정할 수 있어요.
        </Text>
      ) : null}

      <Text style={[styles.label, { color: c.textSub }]}>예배 이름 *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="예배 이름"
        placeholderTextColor={c.textSub}
        editable={canEdit}
        style={[
          styles.input,
          {
            borderColor: c.border,
            color: c.text,
            backgroundColor: c.card,
            opacity: canEdit ? 1 : 0.55,
          },
        ]}
        autoCorrect={false}
        autoCapitalize="sentences"
      />

      <Text style={[styles.label, { color: c.textSub }]}>날짜 *</Text>
      <WorshipDatePickerField value={date} onChange={setDate} disabled={!canEdit} />

      <Button title="저장" onPress={save} loading={loading} disabled={loading || !canEdit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  hint: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginBottom: 8 },
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
