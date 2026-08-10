import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteSongSheet, pickAndInsertSongSheet, type SongSheet } from '@/lib/songSheets';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export function useSongSheets(songId: string | undefined) {
  const gatheringId = useUserStore((s) => s.gatheringId);

  return useQuery({
    queryKey: ['song-sheets', songId, gatheringId],
    queryFn: async (): Promise<SongSheet[]> => {
      if (!songId) return [];
      const { data, error } = await supabase.rpc('list_song_sheets', {
        p_song_id: songId,
        p_gathering_id: gatheringId,
      });
      if (error) throw error;
      const rows = (data ?? []) as SongSheet[];
      return rows;
    },
    enabled: !!songId,
    staleTime: 30_000,
  });
}

export function useSongsWithSheets() {
  const gatheringId = useUserStore((s) => s.gatheringId);

  return useQuery({
    queryKey: ['songs-with-sheets', gatheringId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_songs_with_sheets', {
        p_gathering_id: gatheringId,
      });
      if (error) throw error;
      return (data ?? []) as {
        song_id: string;
        title: string;
        artist: string | null;
        sheet_count: number;
      }[];
    },
    staleTime: 30_000,
  });
}

export function useUploadSongSheet(songId: string | undefined) {
  const deviceId = useUserStore((s) => s.deviceId);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!deviceId || !songId) throw new Error('no device/song');
      const res = await pickAndInsertSongSheet({
        deviceId,
        songId,
        gatheringId,
      });
      if (!res.ok) throw new Error(res.message);
      return res.sheet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['song-sheets', songId] });
      qc.invalidateQueries({ queryKey: ['songs-with-sheets'] });
    },
  });
}

export function useDeleteSongSheet(songId: string | undefined) {
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sheetId: string) => {
      if (!deviceId) throw new Error('no device');
      const ok = await deleteSongSheet(deviceId, sheetId);
      if (!ok) throw new Error('삭제에 실패했어요');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['song-sheets', songId] });
      qc.invalidateQueries({ queryKey: ['songs-with-sheets'] });
    },
  });
}
