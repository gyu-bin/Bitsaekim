import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLeaderMyWorships } from '@/hooks/useLeaderMyWorships';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranscriptionStats } from '@/hooks/useTranscription';
import { buildGatheringInviteUrl } from '@/lib/gatheringInviteLink';
import { supabase } from '@/lib/supabase';
import { updateUserDisplayName } from '@/lib/userProfile';
import { useThemeStore } from '@/stores/themeStore';
import { useUserStore } from '@/stores/userStore';

export default function MypageScreen() {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const name = useUserStore((s) => s.name);
  const setName = useUserStore((s) => s.setName);
  const role = useUserStore((s) => s.role);
  const setRole = useUserStore((s) => s.setRole);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const gatheringName = useUserStore((s) => s.gatheringName);
  const gatheringInviteCode = useUserStore((s) => s.gatheringInviteCode);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const toggleDark = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);
  const { data: stats } = useTranscriptionStats();
  const { data: myWorships, isLoading: myWorshipsLoading } = useLeaderMyWorships(
    deviceId ?? null,
    role === 'leader'
  );

  const isGatheringOwner = !!(
    deviceId &&
    gatheringOwnerDeviceId &&
    deviceId === gatheringOwnerDeviceId
  );
  const gatheringOwnerKnown = gatheringId != null && gatheringOwnerDeviceId != null;
  const isNonOwnerLeader =
    role === 'leader' && !!gatheringId && gatheringOwnerKnown && !isGatheringOwner;

  const initial = (name?.[0] ?? '?').toUpperCase();
  const idShort = deviceId ? `${deviceId.slice(0, 6)}…` : '—';

  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const saveDisplayName = async () => {
    if (!deviceId) return;
    setSavingName(true);
    try {
      const res = await updateUserDisplayName(deviceId, nameDraft);
      if (!res.ok) {
        Alert.alert('오류', res.message);
        return;
      }
      setName(nameDraft.trim());
      setNameEditOpen(false);
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      await qc.invalidateQueries({ queryKey: ['user', deviceId] });
      await qc.invalidateQueries({ queryKey: ['creator', deviceId] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSavingName(false);
    }
  };

  const becomeLeader = () => {
    Alert.alert('인도자 권한', '인도자 기능을 활성화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: async () => {
          if (!deviceId) return;
          const { error } = await supabase.rpc('set_user_role', {
            p_device_id: deviceId,
            p_role: 'leader',
          });
          if (error) {
            const msg =
              typeof error.message === 'string' && error.message.length > 0
                ? error.message
                : '역할을 바꾸지 못했습니다.';
            Alert.alert('오류', msg);
            return;
          }
          setRole('leader');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const copyGatheringInviteCode = useCallback(async () => {
    if (!gatheringInviteCode) return;
    try {
      await Clipboard.setStringAsync(gatheringInviteCode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('오류', '복사하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [gatheringInviteCode]);

  const leaveLeader = () => {
    Alert.alert('인도자 해제', '일반 참여자 모드로 돌아갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: async () => {
          if (!deviceId) return;
          const { error } = await supabase.rpc('set_user_role', {
            p_device_id: deviceId,
            p_role: 'user',
          });
          if (error) {
            Alert.alert('오류', error.message ?? '역할을 바꾸지 못했습니다.');
            return;
          }
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
        <View style={styles.heroProfile}>
          <TouchableOpacity
            style={styles.nameEditRow}
            onPress={() => {
              setNameDraft(name ?? '');
              setNameEditOpen(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="이름 편집"
          >
            <Text style={styles.name}>{name ?? '이름 없음'}</Text>
            <Feather name="edit-2" size={16} color="rgba(240,236,228,0.55)" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          {role === 'leader' ? (
            <View
              style={styles.leaderBadge}
              accessibilityRole="text"
              accessibilityLabel="인도자 권한으로 사용 중"
            >
              <Feather name="award" size={13} color={palette.gold} />
              <Text style={styles.leaderBadgeText}>인도자</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Modal
        visible={nameEditOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !savingName && setNameEditOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.nameModalOverlay}
        >
          <Pressable style={styles.nameModalBackdrop} onPress={() => !savingName && setNameEditOpen(false)} />
          <View style={[styles.nameModalCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.nameModalTitle, { color: c.text }]}>표시 이름</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={80}
              placeholder="이름을 입력하세요"
              placeholderTextColor={c.textSub}
              editable={!savingName}
              autoFocus
              style={[
                styles.nameModalInput,
                { color: c.text, borderColor: c.border, backgroundColor: c.background },
              ]}
            />
            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={[styles.nameModalBtn, { borderColor: c.border }]}
                onPress={() => !savingName && setNameEditOpen(false)}
                disabled={savingName}
              >
                <Text style={{ color: c.textSub, ...typeface.sansMedium }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nameModalBtnPrimary, { backgroundColor: c.accent }]}
                onPress={saveDisplayName}
                disabled={savingName}
              >
                <Text style={{ color: '#1a160e', ...typeface.sansMedium }}>{savingName ? '저장 중…' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {gatheringId && gatheringName ? (
        <View style={[styles.gatheringCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.gatheringLabel, { color: c.textSub }]}>내 모임</Text>
          <Text style={[styles.gatheringName, { color: c.text }]} numberOfLines={2}>
            {gatheringName}
          </Text>
          {gatheringInviteCode ? (
            <>
              <TouchableOpacity
                style={[styles.inviteCodeRow, { borderColor: c.accent }]}
                onPress={() => void copyGatheringInviteCode()}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="초대 코드 복사"
              >
                <Text style={[styles.inviteCode, { color: c.accent }]} numberOfLines={1}>
                  초대 코드 {gatheringInviteCode}
                </Text>
                <Feather name="copy" size={18} color={c.accent} />
              </TouchableOpacity>
              <Text style={[styles.gatheringHint, { color: c.textSub }]}>
                코드 줄을 누르면 복사돼요. 새 기기에서도 코드나 링크로 같은 모임에 들어올 수 있어요.
              </Text>
              <TouchableOpacity
                style={[styles.shareInviteBtn, { borderColor: c.accent }]}
                onPress={() => {
                  const url = buildGatheringInviteUrl(gatheringInviteCode);
                  void Share.share({
                    message: `${gatheringName} 모임에 초대합니다.\n코드: ${gatheringInviteCode}\n\n앱에서 열기: ${url}`,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="초대 링크 공유"
              >
                <Text style={[styles.shareInviteText, { color: c.accent }]}>초대 링크 공유</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      {role === 'leader' && !gatheringId ? (
        <TouchableOpacity
          style={[styles.createGatheringRow, { borderColor: c.accent, backgroundColor: c.card }]}
          onPress={() => router.push('/leader/gathering/create' as Href)}
          accessibilityRole="button"
        >
          <Text style={[styles.createGatheringText, { color: c.accent }]}>모임 만들기 (초대 코드 발급)</Text>
          <Feather name="chevron-right" size={20} color={c.accent} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.push('/(tabs)/mypage/transcriptions')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="필사한 곡 목록"
        >
          <Text style={[styles.statN, { color: c.accent }]}>{stats?.songs ?? 0}</Text>
          <Text style={[styles.statL, { color: c.textSub }]}>필사 곡</Text>
          <Text style={[styles.statTap, { color: c.accent }]}>목록 보기</Text>
        </TouchableOpacity>
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
          <View style={[styles.leaderMenuPanel, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={[styles.leaderPanelTitle, { color: c.text }]}>인도자 도구</Text>
            <Text style={[styles.leaderPanelSub, { color: c.textSub }]}>
              예배·찬양을 만들고, 내가 올린 예배의 정보와 콘티를 다룹니다.
            </Text>

            {isNonOwnerLeader ? (
              <View style={[styles.leaderNotice, { backgroundColor: c.accentLight, borderColor: c.border }]}>
                <Feather name="info" size={16} color={c.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.leaderNoticeText, { color: c.textMid }]}>
                  이 모임에서는 예배 등록·예배 정보 수정이 모임장만 가능해요. 찬양 추가와 내가 만든 예배의 콘티는
                  그대로 다룰 수 있어요.
                </Text>
              </View>
            ) : null}

            <Text style={[styles.leaderSectionLabel, { color: c.accent }]}>예배</Text>
            <Text style={[styles.leaderSectionTitle, { color: c.text }]}>새 예배 등록</Text>
            <Text style={[styles.leaderSectionHint, { color: c.textSub }]}>
              날짜·이름을 정해 모임 예배 목록에 올립니다.
            </Text>
            <TouchableOpacity
              style={[
                styles.leaderActionCard,
                {
                  backgroundColor: c.background,
                  borderColor: c.border,
                  opacity: isNonOwnerLeader ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (isNonOwnerLeader) {
                  Alert.alert('알림', '예배를 만드는 것은 이 모임의 모임장만 할 수 있어요.');
                  return;
                }
                router.push('/leader/worship/create');
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="새 예배 등록"
            >
              <View style={[styles.leaderActionIcon, { backgroundColor: c.accentLight }]}>
                <Feather name="calendar" size={22} color={c.accent} />
              </View>
              <View style={styles.leaderActionTextCol}>
                <Text style={[styles.leaderActionPrimary, { color: c.text }]}>콘티 만들기</Text>
                <Text style={[styles.leaderActionSecondary, { color: c.textSub }]} numberOfLines={2}>
                  모임원 필사·나눔 화면에 바로 보입니다.
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color={c.textSub} />
            </TouchableOpacity>

            <View style={[styles.leaderDivider, { backgroundColor: c.border }]} />

            <Text style={[styles.leaderSectionLabel, { color: c.accent }]}>찬양</Text>
            <Text style={[styles.leaderSectionTitle, { color: c.text }]}>찬양 추가하기</Text>
            <Text style={[styles.leaderSectionHint, { color: c.textSub }]}>
              제목·가사를 넣으면 콘티 편집·검색에서 고를 수 있어요.
            </Text>
            <TouchableOpacity
              style={[styles.leaderActionCard, { backgroundColor: c.background, borderColor: c.border }]}
              onPress={() => router.push('/leader/song/create')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="찬양 곡 추가"
            >
              <View style={[styles.leaderActionIcon, { backgroundColor: c.accentLight }]}>
                <Feather name="music" size={22} color={c.accent} />
              </View>
              <View style={styles.leaderActionTextCol}>
                <Text style={[styles.leaderActionPrimary, { color: c.text }]}>찬양 추가</Text>
                <Text style={[styles.leaderActionSecondary, { color: c.textSub }]} numberOfLines={2}>
                  새 찬양을 등록합니다.
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color={c.textSub} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.leaderBlockHeading, { color: c.text }]}>내가 올린 예배</Text>
          <Text style={[styles.myWorshipHint, { color: c.textSub }]}>
            이름·날짜는 「정보 수정」, 곡 순서·특송은 「콘티 편집」에서 바꿀 수 있어요.
          </Text>
          {myWorshipsLoading ? (
            <Text style={[styles.myWorshipHint, { color: c.textSub }]}>불러오는 중…</Text>
          ) : (myWorships?.length ?? 0) === 0 ? (
            <Text style={[styles.myWorshipHint, { color: c.textSub }]}>
              {isNonOwnerLeader
                ? '모임장이 만든 예배가 여기에 표시됩니다. (편집은 모임장만 가능해요.)'
                : '아직 올린 예배가 없습니다.'}
            </Text>
          ) : (
            (myWorships ?? []).map((w) => {
              const [y, m, d] = w.service_date.split('-');
              const dateLabel = `${y}.${m}.${d}`;
              return (
                <View
                  key={w.id}
                  style={[styles.myWorshipCard, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  <Text style={[styles.myWorshipDate, { color: c.textSub }]}>{dateLabel}</Text>
                  <Text style={[styles.myWorshipName, { color: c.text }]} numberOfLines={2}>
                    {w.name}
                  </Text>
                  <Text style={[styles.myWorshipActionHint, { color: c.textSub }]}>
                    예배 안내 문구·날짜 / 콘티 곡·순서
                  </Text>
                  <View style={styles.myWorshipActions}>
                    <TouchableOpacity
                      style={[styles.myWorshipBtn, { borderColor: c.accent, backgroundColor: c.background }]}
                      onPress={() => router.push(`/leader/worship/${w.id}/edit`)}
                    >
                      <Text style={[styles.myWorshipBtnLabel, { color: c.textSub }]}>이름·날짜</Text>
                      <Text style={[styles.myWorshipBtnText, { color: c.accent }]}>정보 수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.myWorshipBtn, { borderColor: c.accent, backgroundColor: c.background }]}
                      onPress={() => router.push(`/leader/worship/${w.id}/conti`)}
                    >
                      <Text style={[styles.myWorshipBtnLabel, { color: c.textSub }]}>곡·순서</Text>
                      <Text style={[styles.myWorshipBtnText, { color: c.accent }]}>콘티 편집</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity onPress={leaveLeader} style={{ marginTop: 12 }}>
            <Text style={{ color: c.textSub, ...typeface.sans, textAlign: 'center' }}>
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
  heroProfile: { alignItems: 'center', marginTop: 8 },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 169, 106, 0.55)',
    backgroundColor: 'rgba(212, 169, 106, 0.12)',
  },
  leaderBadgeText: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    color: palette.goldLight,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeface.serifBold, fontSize: 28, color: '#1a160e' },
  nameEditRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  name: {
    ...typeface.serifBold,
    fontSize: fontSize.xl,
    color: '#f0ece4',
  },
  nameModalOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  nameModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  nameModalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  nameModalTitle: { ...typeface.sansMedium, fontSize: fontSize.md, marginBottom: 12 },
  nameModalInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nameModalActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  nameModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  nameModalBtnPrimary: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  deviceId: { ...typeface.mono, fontSize: fontSize.xs, color: 'rgba(240,236,228,0.5)', marginTop: 6 },
  gatheringCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  gatheringLabel: { ...typeface.sans, fontSize: fontSize.xs, marginBottom: 4 },
  gatheringName: { ...typeface.sansMedium, fontSize: fontSize.md, lineHeight: 22 },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inviteCode: { ...typeface.mono, fontSize: fontSize.md, letterSpacing: 1, flex: 1, minWidth: 0 },
  gatheringHint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 8, lineHeight: 18 },
  shareInviteBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  shareInviteText: { ...typeface.sansMedium, fontSize: fontSize.sm },
  createGatheringRow: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  createGatheringText: { ...typeface.sansMedium, fontSize: fontSize.md, flex: 1, marginRight: 8 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statN: { ...typeface.serifBold, fontSize: fontSize.xl },
  statL: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4 },
  statTap: { ...typeface.sansMedium, fontSize: 10, marginTop: 6 },
  streak: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
  },
  streakTitle: { ...typeface.sansMedium, fontSize: fontSize.md, color: '#1a160e' },
  streakSub: { ...typeface.sans, fontSize: fontSize.sm, color: '#4a3f2f', marginTop: 4 },
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
  linkText: { ...typeface.sansMedium, fontSize: fontSize.md },
  leaderCard: {
    margin: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaderTitle: { ...typeface.sansMedium, fontSize: fontSize.md },
  leaderSub: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 6 },
  leaderMenu: { paddingHorizontal: 16, marginTop: 20 },
  leaderMenuPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 8,
  },
  leaderPanelTitle: { ...typeface.serifBold, fontSize: fontSize.xl },
  leaderPanelSub: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 21, marginTop: 8 },
  leaderNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaderNoticeText: { ...typeface.sans, fontSize: fontSize.sm, flex: 1, lineHeight: 20 },
  leaderSectionLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginTop: 20,
  },
  leaderSectionTitle: { ...typeface.serifBold, fontSize: fontSize.lg, marginTop: 4 },
  leaderSectionHint: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 6, lineHeight: 20 },
  leaderActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaderActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderActionTextCol: { flex: 1, minWidth: 0 },
  leaderActionPrimary: { ...typeface.sansMedium, fontSize: fontSize.md },
  leaderActionSecondary: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4, lineHeight: 19 },
  leaderDivider: { height: StyleSheet.hairlineWidth, marginTop: 22, marginBottom: 2 },
  leaderBlockHeading: {
    ...typeface.serifBold,
    fontSize: fontSize.lg,
    marginTop: 22,
    marginBottom: 4,
  },
  myWorshipHint: { ...typeface.sans, fontSize: fontSize.sm, marginBottom: 12, lineHeight: 20 },
  myWorshipCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  myWorshipName: { ...typeface.serifBold, fontSize: fontSize.md, marginTop: 6, lineHeight: 24 },
  myWorshipDate: { ...typeface.mono, fontSize: fontSize.xs },
  myWorshipActionHint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 8 },
  myWorshipActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  myWorshipBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  myWorshipBtnLabel: { ...typeface.sans, fontSize: fontSize.xs, marginBottom: 2 },
  myWorshipBtnText: { ...typeface.sansMedium, fontSize: fontSize.sm },
});
