import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

function parseRpcUuidList(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (typeof row === 'string') return row;
      if (row && typeof row === 'object' && 'song_id' in row) {
        const v = (row as { song_id: unknown }).song_id;
        return typeof v === 'string' ? v : '';
      }
      return '';
    })
    .filter(Boolean);
}

export function useLeaderSongFavorites(deviceId: string | null) {
  return useQuery({
    queryKey: ['leader-favorites', deviceId],
    queryFn: async () => {
      if (!deviceId) return new Set<string>();
      const { data, error } = await supabase.rpc('leader_favorites_list_ids', {
        p_device_id: deviceId,
      });
      if (error) throw error;
      return new Set(parseRpcUuidList(data));
    },
    enabled: !!deviceId,
  });
}

export function useToggleLeaderSongFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deviceId, songId }: { deviceId: string; songId: string }) => {
      const { data, error } = await supabase.rpc('leader_favorite_toggle', {
        p_device_id: deviceId,
        p_song_id: songId,
      });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: (_favorited, { deviceId }) => {
      void qc.invalidateQueries({ queryKey: ['leader-favorites', deviceId] });
    },
  });
}
