import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radius } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { clearUserAvatarOnServer, syncUserAvatarFromLocal } from '@/lib/avatarSync';
import {
  pickAndSaveProfilePhoto,
  profilePhotoExists,
  removeProfilePhotoFile,
  resolveProfilePhotoUri,
} from '@/lib/profilePhoto';
import { showToast } from '@/stores/toastStore';
import { useUserStore } from '@/stores/userStore';

const SIZE = 96;

type Props = {
  name: string | null;
  deviceId: string | null;
};

export function ProfileAvatar({ name, deviceId }: Props) {
  const qc = useQueryClient();
  const c = useThemeColors();
  const profilePhotoUri = useUserStore((s) => s.profilePhotoUri);
  const setProfilePhoto = useUserStore((s) => s.setProfilePhoto);
  const setAvatarUrl = useUserStore((s) => s.setAvatarUrl);
  const avatarUrl = useUserStore((s) => s.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [displayUri, setDisplayUri] = useState<string | null>(null);

  const initial = (name?.[0] ?? '?').toUpperCase();

  useEffect(() => {
    void (async () => {
      if (!profilePhotoUri) {
        setDisplayUri(null);
        return;
      }
      const ok = await profilePhotoExists(profilePhotoUri);
      if (!ok) {
        setProfilePhoto(null);
        setDisplayUri(null);
        return;
      }
      setDisplayUri(resolveProfilePhotoUri(profilePhotoUri));
    })();
  }, [profilePhotoUri, setProfilePhoto]);

  useEffect(() => {
    if (!deviceId || !profilePhotoUri || avatarUrl) return;
    void (async () => {
      const res = await syncUserAvatarFromLocal(deviceId, profilePhotoUri);
      if (res.ok) {
        setAvatarUrl(res.publicUrl);
        await qc.invalidateQueries({ queryKey: ['gallery'] });
      }
    })();
  }, [deviceId, profilePhotoUri, avatarUrl, setAvatarUrl, qc]);

  const onPress = () => {
    if (!deviceId) return;

    const actions: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: '사진 선택',
        onPress: () => {
          void (async () => {
            setLoading(true);
            try {
              const uri = await pickAndSaveProfilePhoto(deviceId);
              if (!uri) return;
              setProfilePhoto(uri);
              setDisplayUri(resolveProfilePhotoUri(uri));
              const sync = await syncUserAvatarFromLocal(deviceId, uri);
              if (!sync.ok) {
                showToast(sync.message);
                return;
              }
              setAvatarUrl(sync.publicUrl);
              await qc.invalidateQueries({ queryKey: ['gallery'] });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('프로필 사진을 저장했어요');
            } finally {
              setLoading(false);
            }
          })();
        },
      },
    ];

    if (displayUri) {
      actions.push({
        text: '사진 삭제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!deviceId) return;
            await removeProfilePhotoFile(deviceId);
            setProfilePhoto(null);
            setDisplayUri(null);
            const cleared = await clearUserAvatarOnServer(deviceId);
            if (cleared.ok) {
              setAvatarUrl(null);
              await qc.invalidateQueries({ queryKey: ['gallery'] });
            }
            showToast('프로필 사진을 삭제했어요');
          })();
        },
      });
    }

    actions.push({ text: '취소', style: 'cancel' });
    Alert.alert('프로필 사진', undefined, actions);
  };

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="프로필 사진 변경"
      disabled={!deviceId || loading}
    >
      <View style={[styles.ring, { borderColor: c.accent }]}>
        {loading ? (
          <ActivityIndicator color={c.accent} />
        ) : displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.fallback, { backgroundColor: c.accent }]}>
            <Text style={[styles.initial, { color: c.onAccent }]}>{initial}</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: c.card, borderColor: c.border }]}>
          <Feather name="camera" size={14} color={c.accent} />
        </View>
      </View>
      <Text style={[styles.hint, { color: c.textSub }]}>탭해서 사진 변경</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: SIZE, height: SIZE },
  fallback: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...typeface.sansMedium, fontSize: 36 },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 8 },
});
