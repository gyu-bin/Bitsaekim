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
  worship_id: string;
  song_id: string;
  image_url: string;
  created_at: string;
  user?: Pick<User, 'name'> | null;
  song?: Pick<Song, 'title' | 'artist'> | null;
  worship?: Pick<WorshipService, 'name'> | null;
  likes_count?: number;
  is_liked?: boolean;
}

export type TranscribeMode = 'typing' | 'handwriting';
