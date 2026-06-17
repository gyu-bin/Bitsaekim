import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radius, shadow, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchRecoveryCodeForDevice, generateRecoveryCode } from '@/lib/recoveryCode';
import { showToast } from '@/stores/toastStore';
import { useUserStore } from '@/stores/userStore';

type Props = {
  horizontalGutter: number;
};

export function RecoveryCodeCard({ horizontalGutter }: Props) {
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const recoveryCode = useUserStore((s) => s.recoveryCode);
  const setRecoveryCode = useUserStore((s) => s.setRecoveryCode);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const loadCode = useCallback(async () => {
    if (!deviceId) return;
    setFetching(true);
    try {
      const code = await fetchRecoveryCodeForDevice(deviceId);
      setRecoveryCode(code);
    } finally {
      setFetching(false);
    }
  }, [deviceId, setRecoveryCode]);

  useEffect(() => {
    if (!deviceId || recoveryCode) return;
    void loadCode();
  }, [deviceId, recoveryCode, loadCode]);

  const issueCode = async () => {
    if (!deviceId || loading) return;
    setLoading(true);
    try {
      const code = await generateRecoveryCode(deviceId);
      if (!code) {
        showToast('복구 코드를 발급하지 못했어요', 'error');
        return;
      }
      setRecoveryCode(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('복구 코드를 발급했어요');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!recoveryCode) return;
    await Clipboard.setStringAsync(recoveryCode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('복구 코드를 복사했어요');
  };

  const shareCode = async () => {
    if (!recoveryCode) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `[빛새김] 기기 이전용 복구 코드: ${recoveryCode}\n새 기기에서 빛새김 앱 > 다른 기기에서 이어하기 > 복구 코드 입력`,
    });
  };

  if (!deviceId) return null;

  return (
    <View style={[styles.wrap, { marginHorizontal: horizontalGutter }]}>
      <View
        style={[
          styles.card,
          shadow.sm,
          {
            backgroundColor: c.card,
            borderColor: c.accent,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Feather name="shield" size={18} color={c.accent} />
          <Text style={[styles.title, { color: c.text }]}>기기 이전 복구 코드</Text>
        </View>
        <Text style={[styles.desc, { color: c.textSub }]}>
          기기를 바꾸거나 앱을 재설치할 때 필요해요. 안전한 곳에 보관해 주세요.
        </Text>

        {fetching ? (
          <ActivityIndicator color={c.accent} style={styles.loader} />
        ) : recoveryCode ? (
          <>
            <Text style={[styles.code, { color: c.accentDark }]} accessibilityLabel="복구 코드">
              {recoveryCode}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={() => void copyCode()}
              >
                <Feather name="copy" size={16} color={c.accent} />
                <Text style={[styles.actionText, { color: c.text }]}>복사</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={() => void shareCode()}
              >
                <Feather name="share-2" size={16} color={c.accent} />
                <Text style={[styles.actionText, { color: c.text }]}>공유</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.issueBtn, { backgroundColor: c.accentMuted, borderColor: c.accent }]}
            onPress={() => void issueCode()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={c.accent} />
            ) : (
              <Text style={[styles.issueText, { color: c.accentDark }]}>복구 코드 발급받기</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
  desc: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  loader: { marginVertical: 12 },
  code: {
    ...typeface.mono,
    fontSize: 32,
    letterSpacing: 6,
    textAlign: 'center',
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
  },
  issueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  issueText: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
});
