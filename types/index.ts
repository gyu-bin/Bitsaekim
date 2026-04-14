export interface User {
  device_id: string;
  name: string;
  role: 'user' | 'leader';
  created_at: string;
}

export interface LyricVerse {
  label: string;
  lines: string[];
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  lyrics: LyricVerse[];
  background_story?: string;
  bible_verse?: string;
  song_key?: string;
  bpm?: number;
  created_by?: string;
  created_at: string;
}

export interface WorshipService {
  id: string;
  name: string;
  service_date: string;
  service_time?: string;
  description?: string;
  creator_id: string;
  gathering_id?: string | null;
  created_at: string;
}

export interface Gathering {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface SetlistItem {
  id: string;
  worship_id: string;
  song_id?: string;
  order_index: number;
  custom_label?: string;
  leader_note?: string;
  is_special: boolean;
  song?: Song | null;
}

export interface GalleryPost {
  id: string;
  device_id: string;
  worship_id: string | null;
  song_id: string | null;
  /** 필사 사진 등 (없을 수 있음) */
  image_url: string | null;
  /** 묵상·느낀 점 (선택) */
  body?: string | null;
  /** 은혜 받은 영상·악보 링크 등 */
  link_url?: string | null;
  /** 나누고 싶은 가사·필사 문구 */
  lyrics_share?: string | null;
  created_at: string;
  user?: Pick<User, 'name'> | null;
  song?: Pick<Song, 'title' | 'artist'> | null;
  worship?: Pick<WorshipService, 'name'> | null;
  likes_count?: number;
  is_liked?: boolean;
}

export type TranscribeMode = 'typing' | 'handwriting';

/** 필사 캔버스 → 임시 JPEG 파일 (나눔 업로드·공유·앨범 저장) */
export type TranscriptionWorkCaptureHandle = {
  captureToTempJpeg: () => Promise<string | null>;
};
