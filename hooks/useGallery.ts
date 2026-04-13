import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { GalleryPost } from '@/types';

const PAGE = 20;

type GalleryRow = GalleryPost & {
  user?: { name: string } | null;
  song?: { title: string; artist?: string } | null;
  worship?: { name: string } | null;
};

async function fetchGalleryPage(
  page: number,
  worshipId?: string,
  mine?: boolean,
  deviceId?: string | null
): Promise<GalleryPost[]> {
  let q = supabase
    .from('gallery_posts')
    .select(
      `
      *,
      user:users(name),
      song:songs(title, artist),
      worship:worship_services(name)
    `
    )
    .order('created_at', { ascending: false })
    .range(page * PAGE, (page + 1) * PAGE - 1);

  if (worshipId) q = q.eq('worship_id', worshipId);
  if (mine && deviceId) q = q.eq('device_id', deviceId);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as GalleryRow[];

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: likeRows } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', ids);

  const countMap = new Map<string, number>();
  for (const l of likeRows ?? []) {
    const id = l.post_id as string;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  let likedSet = new Set<string>();
  if (deviceId) {
    const { data: mineLikes } = await supabase
      .from('likes')
      .select('post_id')
      .in('post_id', ids)
      .eq('device_id', deviceId);
    likedSet = new Set((mineLikes ?? []).map((x) => x.post_id as string));
  }

  return rows.map((r) => ({
    ...r,
    likes_count: countMap.get(r.id) ?? 0,
    is_liked: likedSet.has(r.id),
  }));
}

export function useGallery(worshipId?: string, mine?: boolean) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useInfiniteQuery({
    queryKey: ['gallery', worshipId ?? 'all', mine ? 'mine' : 'all', deviceId],
    queryFn: async ({ pageParam }) =>
      fetchGalleryPage(pageParam, worshipId, mine, deviceId),
    getNextPageParam: (lastPage, _all, lastPageParam) =>
      lastPage.length === PAGE ? lastPageParam + 1 : undefined,
    initialPageParam: 0,
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
