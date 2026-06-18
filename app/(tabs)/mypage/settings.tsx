import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { GatheringInviteSettings } from '@/components/mypage/GatheringInviteSettings';
import { RecoveryCodeCard } from '@/components/mypage/RecoveryCodeCard';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { FEEDBACK_URL } from '@/constants/links';
import { radius, shadow, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { rememberRegisteredDeviceId } from '@/lib/device';
import { useThemeStore } from '@/stores/themeStore';
import { useUserStore } from '@/stores/userStore';

export default function SettingsScreen() {
  const qc = useQueryClient();
  const { horizontalGutter, listBottomPadding } = useLayoutMetrics();
  const c = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggle);

  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const logout = useUserStore((s) => s.logout);

  const isGatheringOwner = !!(
    deviceId &&
    gatheringOwnerDeviceId &&
    deviceId === gatheringOwnerDeviceId
  );

  const confirmLogout = useCallback(() => {
    Alert.alert(
      '로그아웃',
      '이 기기에서 이름·모임 정보를 지웁니다. 같은 기기라면 시작 화면에서 「이어서 시작하기」로 다시 들어올 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            if (deviceId) await rememberRegisteredDeviceId(deviceId);
            logout();
            qc.clear();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }, [deviceId, logout, qc]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{
        paddingHorizontal: horizontalGutter,
        paddingBottom: listBottomPadding,
        paddingTop: spacing.sm,
      }}
    >
      <Text style={[styles.sectionLabel, { color: c.textSub }]}>화면</Text>
      <View style={[styles.card, shadow.sm, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.switchRow}>
          <View style={[styles.iconWrap, { backgroundColor: c.accentMuted }]}>
            <Feather name={isDark ? 'moon' : 'sun'} size={18} color={c.accent} />
          </View>
          <View style={styles.switchText}>
            <Text style={[styles.switchTitle, { color: c.text }]}>다크 모드</Text>
            <Text style={[styles.switchSub, { color: c.textSub }]}>밝은 테마와 어두운 테마를 바꿔요</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={() => {
              void Haptics.selectionAsync();
              toggleDark();
            }}
            trackColor={{ false: c.border, true: c.accentMuted }}
            thumbColor={isDark ? c.accent : c.card}
            accessibilityLabel="다크 모드"
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textSub }]}>기기 이전</Text>
      <RecoveryCodeCard horizontalGutter={0} />

      {isGatheringOwner && gatheringId && deviceId ? (
        <>
          <Text style={[styles.sectionLabel, { color: c.textSub }]}>모임 초대</Text>
          <View style={[styles.card, shadow.sm, { backgroundColor: c.card, borderColor: c.border }]}>
            <GatheringInviteSettings gatheringId={gatheringId} deviceId={deviceId} />
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionLabel, { color: c.textSub }]}>지원</Text>
      <SettingsRow
        icon="message-circle"
        title="피드백 보내기"
        subtitle="불편한 점이나 개선 아이디어를 알려주세요"
        onPress={() => void Linking.openURL(FEEDBACK_URL)}
        style={styles.rowGap}
      />

      <Text style={[styles.sectionLabel, { color: c.textSub }]}>계정</Text>
      <SettingsRow
        icon="log-out"
        title="로그아웃"
        subtitle="이 기기에서 이름·모임 정보를 지웁니다"
        destructive
        onPress={confirmLogout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: 10,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: { flex: 1 },
  switchTitle: { ...typeface.sansMedium, fontSize: fontSize.md },
  switchSub: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4, lineHeight: 19 },
  rowGap: { marginBottom: 0 },
});
