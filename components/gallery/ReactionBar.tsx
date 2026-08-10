import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export type ReactionEmoji = 'heart' | 'amen' | 'cheer';

const REACTIONS: { emoji: ReactionEmoji; label: string; glyph: string }[] = [
  { emoji: 'heart', label: '좋아요', glyph: '♥' },
  { emoji: 'amen', label: '아멘', glyph: '†' },
  { emoji: 'cheer', label: '응원', glyph: '✦' },
];

type Props = {
  postId: string;
  /** emoji → count */
  initialCounts?: Partial<Record<ReactionEmoji, number>>;
  /** 내가 누른 emoji들 */
  initialMine?: ReactionEmoji[];
  compact?: boolean;
};

export function ReactionBar({
  postId,
  initialCounts,
  initialMine,
  compact,
}: Props) {
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();
  const [counts, setCounts] = useState<Record<ReactionEmoji, number>>({
    heart: initialCounts?.heart ?? 0,
    amen: initialCounts?.amen ?? 0,
    cheer: initialCounts?.cheer ?? 0,
  });
  const [mine, setMine] = useState<Set<ReactionEmoji>>(
    () => new Set(initialMine ?? [])
  );

  useEffect(() => {
    setCounts({
      heart: initialCounts?.heart ?? 0,
      amen: initialCounts?.amen ?? 0,
      cheer: initialCounts?.cheer ?? 0,
    });
    setMine(new Set(initialMine ?? []));
  }, [initialCounts?.heart, initialCounts?.amen, initialCounts?.cheer, initialMine, postId]);

  const toggle = useCallback(
    async (emoji: ReactionEmoji) => {
      if (!deviceId) {
        Alert.alert('알림', '온보딩 정보가 없습니다.');
        return;
      }
      const wasActive = mine.has(emoji);
      const prevCount = counts[emoji];
      const nextMine = new Set(mine);
      if (wasActive) nextMine.delete(emoji);
      else nextMine.add(emoji);
      setMine(nextMine);
      setCounts((prev) => ({
        ...prev,
        [emoji]: Math.max(0, prevCount + (wasActive ? -1 : 1)),
      }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const { error } = await supabase.rpc('toggle_reaction', {
          p_device_id: deviceId,
          p_post_id: postId,
          p_emoji: emoji,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['gallery'] });
      } catch {
        setMine(mine);
        setCounts((prev) => ({ ...prev, [emoji]: prevCount }));
        Alert.alert('오류', '반응 처리에 실패했습니다.');
      }
    },
    [counts, deviceId, mine, postId, qc]
  );

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {REACTIONS.map((r) => {
        const active = mine.has(r.emoji);
        const count = counts[r.emoji];
        return (
          <Pressable
            key={r.emoji}
            onPress={() => void toggle(r.emoji)}
            style={[
              styles.chip,
              {
                borderColor: active ? c.accent : c.border,
                backgroundColor: active ? c.accentMuted : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}${active ? ' 취소' : ''}`}
          >
            <Text style={[styles.glyph, { color: active ? c.accent : c.textSub }]}>
              {r.glyph}
            </Text>
            {count > 0 ? (
              <Text style={[styles.count, { color: active ? c.accent : c.textSub }]}>
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCompact: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: { ...typeface.sansMedium, fontSize: fontSize.sm },
  count: { ...typeface.mono, fontSize: fontSize.xs },
});
