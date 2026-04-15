import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorshipDatePickerField } from '@/components/leader/WorshipDatePickerField';
import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { formatWorshipDateIso } from '@/lib/worshipDate';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

function normalizeName(n: string) {
  return n.trim().replace(/\s+/g, ' ');
}

export default function CreateWorshipScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);

  const { data: worships, isLoading: worshipsLoading } = useWorships();
  const existingNames = useMemo(() => {
    const set = new Set<string>();
    for (const w of worships ?? []) {
      const t = normalizeName(w.name ?? '');
      if (t.length > 0) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [worships]);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** 목록에 없는 새 이름을 직접 쓸 때 */
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    if (worshipsLoading) return;
    if (existingNames.length === 0) {
      setCustomMode(true);
    }
  }, [worshipsLoading, existingNames.length]);

  const isGatheringOwner = useMemo(
    () =>
      !!(deviceId && gatheringOwnerDeviceId && deviceId === gatheringOwnerDeviceId),
    [deviceId, gatheringOwnerDeviceId]
  );
  const ownerKnown = gatheringId != null && gatheringOwnerDeviceId != null;
  const isNonOwner = ownerKnown && !isGatheringOwner;

  const pickName = (picked: string) => {
    setName(picked);
    setCustomMode(false);
    setPickerOpen(false);
  };

  const startCustomName = () => {
    setName('');
    setCustomMode(true);
    setPickerOpen(false);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('알림', '예배 이름을 선택하거나 입력해 주세요.');
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

  const showPickerTrigger = existingNames.length > 0 && !customMode;

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
      {worshipsLoading ? (
        <Text style={[styles.loadingNames, { color: c.textSub }]}>예배 목록을 불러오는 중…</Text>
      ) : showPickerTrigger ? (
        <>
          <TouchableOpacity
            style={[styles.selectField, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="예배 이름 선택"
          >
            <Text
              style={[styles.selectFieldText, { color: name ? c.text : c.textSub }]}
              numberOfLines={2}
            >
              {name ? name : '예배 이름을 선택해 주세요'}
            </Text>
            <Feather name="chevron-down" size={22} color={c.textSub} />
          </TouchableOpacity>
          <TouchableOpacity onPress={startCustomName} style={styles.linkRow} hitSlop={8}>
            <Text style={[styles.linkText, { color: c.accent }]}>새 이름 직접 입력</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예: 청년2부예배"
            placeholderTextColor={c.textSub}
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
            autoCorrect={false}
            autoCapitalize="sentences"
          />
          {existingNames.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setCustomMode(false);
                setPickerOpen(true);
              }}
              style={styles.linkRow}
              hitSlop={8}
            >
              <Text style={[styles.linkText, { color: c.accent }]}>기존 이름 목록에서 선택</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      <Text style={[styles.label, { color: c.textSub }]}>날짜 *</Text>
      <WorshipDatePickerField value={date} onChange={setDate} />

      <Button
        title="저장 후 콘티 편성"
        onPress={submit}
        loading={loading}
        disabled={loading || isNonOwner || (!!gatheringId && !ownerKnown)}
      />

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
          <Text style={[styles.modalTitle, { color: c.text }]}>예배 이름 선택</Text>
          <Text style={[styles.modalSub, { color: c.textSub }]}>
            모임에 이미 있는 이름입니다. 새로 만든 예배는 저장 후 여기에 자동으로 나타나요.
          </Text>
          <FlatList
            data={existingNames}
            keyExtractor={(item) => item}
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: c.border }]}
                onPress={() => pickName(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalRowText, { color: c.text }]} numberOfLines={2}>
                  {item}
                </Text>
                <Feather name="chevron-right" size={20} color={c.textSub} />
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalFooterBtn} onPress={startCustomName} activeOpacity={0.75}>
            <Text style={[styles.modalFooterText, { color: c.accent }]}>새 이름 직접 입력</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancel} onPress={() => setPickerOpen(false)}>
            <Text style={{ color: c.textSub, ...typeface.sansMedium }}>닫기</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  hint: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20, marginBottom: 4 },
  label: { ...typeface.sansMedium, fontSize: fontSize.sm, marginTop: 8 },
  loadingNames: { ...typeface.sans, fontSize: fontSize.sm, marginBottom: 8 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  selectFieldText: { ...typeface.sans, fontSize: fontSize.md, flex: 1 },
  linkRow: { alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 4 },
  linkText: { ...typeface.sansMedium, fontSize: fontSize.sm },
  input: {
    ...typeface.sans,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '72%',
  },
  modalTitle: { ...typeface.serifBold, fontSize: fontSize.lg },
  modalSub: { ...typeface.sans, fontSize: fontSize.xs, lineHeight: 18, marginTop: 8, marginBottom: 8 },
  modalList: { flexGrow: 0 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowText: { ...typeface.sansMedium, fontSize: fontSize.md, flex: 1, paddingRight: 12 },
  modalFooterBtn: { paddingVertical: 14, alignItems: 'center' },
  modalFooterText: { ...typeface.sansMedium, fontSize: fontSize.sm },
  modalCancel: { paddingVertical: 10, alignItems: 'center' },
});
