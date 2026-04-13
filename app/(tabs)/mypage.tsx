import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fonts } from '@/constants/fonts';
import { palette } from '@/constants/colors';
import { useTranscriptionStats } from '@/hooks/useTranscription';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';

export default function MypageScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const name = useUserStore((s) => s.name);
  const role = useUserStore((s) => s.role);
  const setRole = useUserStore((s) => s.setRole);
  const toggleDark = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);
  const { data: stats } = useTranscriptionStats();

  const initial = (name?.[0] ?? '?').toUpperCase();
  const idShort = deviceId ? `${deviceId.slice(0, 6)}…` : '—';

  const becomeLeader = () => {
    Alert.alert('인도자 권한', '인도자 기능을 활성화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: async () => {
          if (!deviceId) return;
          const { error } = await supabase
            .from('users')
            .update({ role: 'leader' })
            .eq('device_id', deviceId);
          if (error) {
            Alert.alert('오류', '역할을 바꾸지 못했습니다.');
            return;
          }
          setRole('leader');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const leaveLeader = () => {
    Alert.alert('인도자 해제', '일반 참여자 모드로 돌아갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: async () => {
          if (!deviceId) return;
          await supabase.from('users').update({ role: 'user' }).eq('device_id', deviceId);
          setRole('user');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={[styles.hero, { backgroundColor: '#141008' }]}>
        <TouchableOpacity
          style={styles.themeBtn}
          onPress={toggleDark}
          accessibilityLabel="다크 모드"
        >
          <Feather name={isDark ? 'sun' : 'moon'} size={22} color="#f0ece4" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{name ?? '이름 없음'}</Text>
        <Text style={styles.deviceId}>기기 {idShort}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.statN, { color: c.accent }]}>{stats?.songs ?? 0}</Text>
          <Text style={[styles.statL, { color: c.textSub }]}>필사 곡</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.statN, { color: c.accent }]}>{stats?.worships ?? 0}</Text>
          <Text style={[styles.statL, { color: c.textSub }]}>예배</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.statN, { color: c.accent }]}>{stats?.uploads ?? 0}</Text>
          <Text style={[styles.statL, { color: c.textSub }]}>업로드</Text>
        </View>
      </View>

      <View style={[styles.streak, { backgroundColor: palette.gold }]}>
        <Text style={styles.streakTitle}>🔥 연속 필사</Text>
        <Text style={styles.streakSub}>곧 기록됩니다</Text>
      </View>

      <TouchableOpacity
        style={[styles.linkRow, { borderColor: c.border, backgroundColor: c.card }]}
        onPress={() =>
          router.push({ pathname: '/(tabs)/gallery', params: { filter: 'mine' } })
        }
        accessibilityRole="button"
      >
        <Text style={[styles.linkText, { color: c.text }]}>나눔에서 내 필사만 보기</Text>
        <Feather name="chevron-right" size={20} color={c.textSub} />
      </TouchableOpacity>

      {role === 'user' ? (
        <TouchableOpacity style={[styles.leaderCard, { borderColor: c.border }]} onPress={becomeLeader}>
          <Text style={[styles.leaderTitle, { color: c.text }]}>👑 인도자로 전환</Text>
          <Text style={[styles.leaderSub, { color: c.textSub }]}>
            예배·찬양 만들기는 마이페이지에서만 할 수 있어요. 눌러 활성화합니다.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.leaderMenu}>
          <Text style={[styles.menuTitle, { color: c.text }]}>인도자 메뉴</Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => router.push('/leader/worship/create')}
          >
            <Text style={{ color: c.text, fontFamily: fonts.sansMedium }}>예배 생성</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => router.push('/leader/song/create')}
          >
            <Text style={{ color: c.text, fontFamily: fonts.sansMedium }}>찬양 추가</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={leaveLeader} style={{ marginTop: 12 }}>
            <Text style={{ color: c.textSub, fontFamily: fonts.sans, textAlign: 'center' }}>
              인도자가 아니에요
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: 56,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
  },
  themeBtn: { position: 'absolute', top: 16, right: 20, padding: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 28, color: '#1a160e' },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: fontSize.xl,
    color: '#f0ece4',
    marginTop: 12,
  },
  deviceId: { fontFamily: fonts.mono, fontSize: fontSize.xs, color: 'rgba(240,236,228,0.5)', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -20 },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statN: { fontFamily: fonts.serifBold, fontSize: fontSize.xl },
  statL: { fontFamily: fonts.sans, fontSize: fontSize.xs, marginTop: 4 },
  streak: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
  },
  streakTitle: { fontFamily: fonts.sansMedium, fontSize: fontSize.md, color: '#1a160e' },
  streakSub: { fontFamily: fonts.sans, fontSize: fontSize.sm, color: '#4a3f2f', marginTop: 4 },
  linkRow: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkText: { fontFamily: fonts.sansMedium, fontSize: fontSize.md },
  leaderCard: {
    margin: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaderTitle: { fontFamily: fonts.sansMedium, fontSize: fontSize.md },
  leaderSub: { fontFamily: fonts.sans, fontSize: fontSize.sm, marginTop: 6 },
  leaderMenu: { paddingHorizontal: 16, marginTop: 8 },
  menuTitle: { fontFamily: fonts.serifBold, fontSize: fontSize.lg, marginBottom: 10 },
  menuItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
