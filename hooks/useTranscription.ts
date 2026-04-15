import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { TranscribeMode } from '@/types';

export type MyTranscriptionRow = {
  id: string;
  worship_id: string;
  song_id: string;
  mode: TranscribeMode;
  completed_at: string;
  song: { title: string; artist?: string | null } | null;
  worship: { name: string } | null;
};

/** 마이페이지 등: 내가 필사 완료한 곡 목록 (최신순) */
export function useMyTranscriptions(limit = 80) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['transcription-list', deviceId, limit],
    queryFn: async () => {
      if (!deviceId) return [] as MyTranscriptionRow[];
      const { data, error } = await supabase
        .from('transcriptions')
        .select(
          `
          id,
          worship_id,
          song_id,
          mode,
          completed_at,
          song:songs(title, artist),
          worship:worship_services(name)
        `
        )
        .eq('device_id', deviceId)
        .order('completed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = data ?? [];
      return rows.map((raw: Record<string, unknown>) => mapTranscriptionRaw(raw));
    },
    enabled: !!deviceId,
  });
}

/** 예배 홈: 예배별 필사 곡 수 (가벼운 집계) */
export function useTranscriptionCountsByWorship() {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['transcription-counts-by-worship', deviceId],
    queryFn: async () => {
      if (!deviceId) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from('transcriptions')
        .select('worship_id')
        .eq('device_id', deviceId);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        const wid = row.worship_id as string | null;
        if (!wid) continue;
        map[wid] = (map[wid] ?? 0) + 1;
      }
      return map;
    },
    enabled: !!deviceId,
  });
}

/** 한 예배 안에서 날짜별로 묶을 필사 목록 */
export function useTranscriptionsForWorship(worshipId: string | undefined) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['transcriptions-for-worship', deviceId, worshipId],
    queryFn: async () => {
      if (!deviceId || !worshipId) return [] as MyTranscriptionRow[];
      const { data, error } = await supabase
        .from('transcriptions')
        .select(
          `
          id,
          worship_id,
          song_id,
          mode,
          completed_at,
          song:songs(title, artist),
          worship:worship_services(name)
        `
        )
        .eq('device_id', deviceId)
        .eq('worship_id', worshipId)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      return rows.map((raw: Record<string, unknown>) => mapTranscriptionRaw(raw));
    },
    enabled: !!deviceId && !!worshipId,
  });
}

function mapTranscriptionRaw(raw: Record<string, unknown>): MyTranscriptionRow {
  const song = raw.song;
  const worship = raw.worship;
  return {
    id: raw.id as string,
    worship_id: raw.worship_id as string,
    song_id: raw.song_id as string,
    mode: raw.mode as TranscribeMode,
    completed_at: raw.completed_at as string,
    song: (Array.isArray(song) ? song[0] : song) as MyTranscriptionRow['song'],
    worship: (Array.isArray(worship) ? worship[0] : worship) as MyTranscriptionRow['worship'],
  };
}

export function useTranscriptionById(id: string | undefined) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['transcription', id, deviceId],
    queryFn: async () => {
      if (!deviceId || !id) return null;
      const { data, error } = await supabase
        .from('transcriptions')
        .select(
          `
          id,
          worship_id,
          song_id,
          mode,
          completed_at,
          song:songs(title, artist),
          worship:worship_services(name)
        `
        )
        .eq('device_id', deviceId)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapTranscriptionRaw(data as unknown as Record<string, unknown>);
    },
    enabled: !!deviceId && !!id,
  });
}

export type MyGalleryPostRow = {
  id: string;
  image_url: string | null;
  body: string | null;
  created_at: string;
};

/** 내 나눔 중 해당 예배·곡과 맞는 글 (최신순) */
export function useMyGalleryPostsForWorshipSong(
  worshipId: string | undefined,
  songId: string | undefined,
  enabled: boolean
) {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['gallery-mine-for-song', deviceId, worshipId, songId],
    queryFn: async () => {
      if (!deviceId || !worshipId || !songId) return [] as MyGalleryPostRow[];
      const { data, error } = await supabase
        .from('gallery_posts')
        .select('id, image_url, body, created_at')
        .eq('device_id', deviceId)
        .eq('worship_id', worshipId)
        .eq('song_id', songId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as MyGalleryPostRow[];
    },
    enabled: enabled && !!deviceId && !!worshipId && !!songId,
  });
}

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
      const { error } = await supabase.rpc('record_transcription_for_device', {
        p_device_id: deviceId,
        p_worship_id: payload.worshipId,
        p_song_id: payload.songId,
        p_mode: payload.mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcription-stats'] });
      qc.invalidateQueries({ queryKey: ['transcription-list'] });
      qc.invalidateQueries({ queryKey: ['transcription-counts-by-worship'] });
      qc.invalidateQueries({ queryKey: ['transcriptions-for-worship'] });
    },
  });
}
