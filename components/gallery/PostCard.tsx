import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { LikeButton } from '@/components/gallery/LikeButton';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { GalleryPost } from '@/types';

type Props = { post: GalleryPost };

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function PostCard({ post }: Props) {
  const c = useThemeColors();
  const hasImage = !!post.image_url?.startsWith('http');

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.imgBox, { backgroundColor: c.accentLight }]}>
        {hasImage ? (
          <Image source={{ uri: post.image_url }} style={styles.img} contentFit="cover" />
        ) : (
          <Text style={styles.placeholderEmoji}>✍️</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.song, { color: c.text }]} numberOfLines={1}>
          {post.song?.title ?? '곡'}
        </Text>
        <Text style={[styles.worship, { color: c.textSub }]} numberOfLines={1}>
          {post.worship?.name ?? '예배'}
        </Text>
        <View style={styles.footer}>
          <LikeButton
            postId={post.id}
            initialCount={post.likes_count ?? 0}
            initialLiked={post.is_liked ?? false}
          />
          <Text style={[styles.date, { color: c.textSub }]}>{formatCreatedAt(post.created_at)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    margin: 4,
  },
  imgBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  placeholderEmoji: { fontSize: 40 },
  body: { padding: 10, gap: 4 },
  song: { fontFamily: fonts.serif, fontSize: fontSize.sm },
  worship: { fontFamily: fonts.sans, fontSize: fontSize.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  date: { fontFamily: fonts.mono, fontSize: fontSize.xs },
});
