import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { GalleryTimeFilter } from '@/lib/galleryFilter';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { GalleryPost } from '@/types';

const PAGE = 20;

type GalleryRow = GalleryPost & {
  user?: { name: string; avatar_url?: string | null } | null;
  song?: { title: string; artist?: string } | null;
  worship?: { name: string } | null;
};

async function fetchGalleryPage(
  page: number,
  worshipId?: string,
  mine?: boolean,
  deviceId?: string | null,
  since?: string
): Promise<GalleryPost[]> {
  let q = supabase.from('gallery_posts').select(
    `
      id,
      device_id,
      worship_id,
      song_id,
      image_url,
      body,
      link_url,
      lyrics_share,
      created_at,
      user:users(name, avatar_url),
      song:songs(title, artist),
      worship:worship_services(name)
    `
  );

  if (worshipId) q = q.eq('worship_id', worshipId);
  if (mine && deviceId) q = q.eq('device_id', deviceId);
  if (since) q = q.gte('created_at', since);

  q = q.order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);

  const { data, error } = await q;
  if (error) throw error;
  const rawRows = (data ?? []) as Record<string, unknown>[];

  const rows: GalleryRow[] = rawRows.map((raw) => {
    const user = raw.user;
    const song = raw.song;
    const worship = raw.worship;
    return {
      ...(raw as unknown as GalleryPost),
      user: (Array.isArray(user) ? user[0] : user) as GalleryRow['user'],
      song: (Array.isArray(song) ? song[0] : song) as GalleryRow['song'],
      worship: (Array.isArray(worship) ? worship[0] : worship) as GalleryRow['worship'],
    };
  });

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: likeRows } = await supabase
    .from('likes')
    .select('post_id, device_id, emoji')
    .in('post_id', ids);

  type ReactionEmoji = 'heart' | 'amen' | 'cheer';
  const countByPost = new Map<string, Partial<Record<ReactionEmoji, number>>>();
  const mineByPost = new Map<string, ReactionEmoji[]>();

  for (const l of likeRows ?? []) {
    const id = l.post_id as string;
    const emoji = ((l as { emoji?: string }).emoji ?? 'heart') as ReactionEmoji;
    const map = countByPost.get(id) ?? {};
    map[emoji] = (map[emoji] ?? 0) + 1;
    countByPost.set(id, map);
    if (deviceId && l.device_id === deviceId) {
      const mine = mineByPost.get(id) ?? [];
      if (!mine.includes(emoji)) mine.push(emoji);
      mineByPost.set(id, mine);
    }
  }

  return rows.map((r) => {
    const reactions = countByPost.get(r.id) ?? {};
    const likes_count = Object.values(reactions).reduce((a, b) => a + (b ?? 0), 0);
    const my_reactions = mineByPost.get(r.id) ?? [];
    return {
      ...r,
      reactions,
      likes_count,
      is_liked: my_reactions.includes('heart'),
      my_reactions,
    };
  });
}

export function useGallery(
  worshipId?: string,
  mine?: boolean,
  since?: string,
  timeFilter: GalleryTimeFilter = 'all'
) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useInfiniteQuery({
    queryKey: ['gallery', worshipId ?? 'all', mine ? 'mine' : 'all', timeFilter, deviceId],
    queryFn: async ({ pageParam }) =>
      fetchGalleryPage(pageParam, worshipId, mine, deviceId, since),
    getNextPageParam: (lastPage, _all, lastPageParam) =>
      lastPage.length === PAGE ? lastPageParam + 1 : undefined,
    initialPageParam: 0,
    staleTime: 60_000,
  });
}

export function usePostLikeState(postId: string) {
  const deviceId = useUserStore((s) => s.deviceId);
  return useQuery({
    queryKey: ['like', postId, deviceId],
    queryFn: async () => {
      if (!deviceId) return { count: 0, liked: false };
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('device_id', deviceId)
        .maybeSingle();
      return { count: count ?? 0, liked: !!data };
    },
    enabled: !!postId,
  });
}
