import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  fetchGatheringInviteSettings,
  regenerateGatheringInviteCode,
  setGatheringInviteActive,
} from '@/lib/gatheringInviteAdmin';
import { showToast } from '@/stores/toastStore';
import { useUserStore } from '@/stores/userStore';

type Props = {
  gatheringId: string;
  deviceId: string;
};

export function GatheringInviteSettings({ gatheringId, deviceId }: Props) {
  const c = useThemeColors();
  const gatheringName = useUserStore((s) => s.gatheringName);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const setGathering = useUserStore((s) => s.setGathering);

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await fetchGatheringInviteSettings(deviceId, gatheringId);
      if (settings) setActive(settings.inviteCodeActive);
    } finally {
      setLoading(false);
    }
  }, [deviceId, gatheringId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleActive = async (next: boolean) => {
    setToggling(true);
    const prev = active;
    setActive(next);
    try {
      const ok = await setGatheringInviteActive(deviceId, gatheringId, next);
      if (!ok) {
        setActive(prev);
        showToast('설정을 저장하지 못했어요', 'error');
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(next ? '초대 코드를 다시 활성화했어요' : '초대 코드를 비활성화했어요');
    } finally {
      setToggling(false);
    }
  };

  const onRegenerate = () => {
    Alert.alert(
      '새 초대 코드 발급',
      '기존 코드는 더 이상 사용할 수 없어요. 모임원에게 새 코드를 공유해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '발급',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setRegenerating(true);
              try {
                const code = await regenerateGatheringInviteCode(deviceId, gatheringId);
                if (!code) {
                  showToast('새 코드를 발급하지 못했어요', 'error');
                  return;
                }
                setActive(true);
                setGathering(
                  gatheringId,
                  gatheringName ?? '',
                  code,
                  gatheringOwnerDeviceId
                );
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('새 초대 코드를 발급했어요');
              } finally {
                setRegenerating(false);
              }
            })();
          },
        },
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator color={c.accent} style={styles.loader} />;
  }

  return (
    <View style={[styles.wrap, { borderTopColor: c.border }]}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={[styles.label, { color: c.text }]}>코드 비활성화</Text>
          <Text style={[styles.hint, { color: c.textSub }]}>
            잠시 새 참여를 막을 때 켜세요
          </Text>
        </View>
        <Switch
          value={!active}
          onValueChange={(off) => void onToggleActive(!off)}
          disabled={toggling || regenerating}
          trackColor={{ false: c.border, true: c.accentMuted }}
          thumbColor={!active ? c.accent : c.card}
          accessibilityLabel="초대 코드 비활성화"
        />
      </View>

      <TouchableOpacity
        style={[styles.regenBtn, { borderColor: c.accent, backgroundColor: c.accentMuted }]}
        onPress={onRegenerate}
        disabled={regenerating || toggling}
        accessibilityRole="button"
        accessibilityLabel="새 초대 코드 발급"
      >
        {regenerating ? (
          <ActivityIndicator color={c.accent} />
        ) : (
          <>
            <Feather name="refresh-cw" size={16} color={c.accent} />
            <Text style={[styles.regenText, { color: c.accentDark }]}>새 코드 발급</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 12 },
  wrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: { flex: 1 },
  label: { ...typeface.sansMedium, fontSize: fontSize.sm },
  hint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4, lineHeight: 17 },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  regenText: { ...typeface.sansMedium, fontSize: fontSize.sm },
});
