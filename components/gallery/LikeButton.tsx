import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { fontSize, fonts } from '@/constants/fonts';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

type Props = {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
};

export function LikeButton({ postId, initialCount, initialLiked }: Props) {
  const deviceId = useUserStore((s) => s.deviceId);
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const qc = useQueryClient();

  const toggle = useCallback(async () => {
    if (!deviceId) {
      Alert.alert('알림', '로그인(온보딩) 정보가 없습니다.');
      return;
    }
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(nextLiked);
    setCount(nextCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (nextLiked) {
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          device_id: deviceId,
        });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('device_id', deviceId);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['gallery'] });
    } catch {
      setLiked(liked);
      setCount(count);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  }, [count, deviceId, liked, postId, qc]);

  const c = liked ? '#c45c6a' : '#9a8c78';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
    >
      <Feather name="heart" size={16} color={c} style={{ opacity: liked ? 1 : 0.6 }} />
      <Text style={[styles.num, { color: c }]}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  num: { fontFamily: fonts.mono, fontSize: fontSize.xs },
});
