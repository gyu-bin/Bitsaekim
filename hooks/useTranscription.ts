import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { TranscribeMode } from '@/types';

export function useTranscriptionStats() {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['transcription-stats', deviceId],
    queryFn: async () => {
      if (!deviceId) return { songs: 0, worships: 0, uploads: 0 };
      const { count: songs } = await supabase
        .from('transcriptions')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', deviceId);
      const { data: wRows } = await supabase
        .from('transcriptions')
        .select('worship_id')
        .eq('device_id', deviceId);
      const worshipIds = new Set((wRows ?? []).map((r) => r.worship_id).filter(Boolean));
      const { count: uploads } = await supabase
        .from('gallery_posts')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', deviceId);
      return {
        songs: songs ?? 0,
        worships: worshipIds.size,
        uploads: uploads ?? 0,
      };
    },
    enabled: !!deviceId,
  });
}

export function useRecordTranscription() {
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      worshipId: string;
      songId: string;
      mode: TranscribeMode;
    }) => {
      if (!deviceId) throw new Error('no device');
      const { error } = await supabase.from('transcriptions').insert({
        device_id: deviceId,
        worship_id: payload.worshipId,
        song_id: payload.songId,
        mode: payload.mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcription-stats'] });
    },
  });
}
