import { seedSongs } from '@/constants/seeds/songs';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function seedSongsIfEmpty(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { count, error: cErr } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });
  if (cErr) return;
  if ((count ?? 0) > 0) return;

  const rows = seedSongs.map((s) => ({
    title: s.title,
    artist: s.artist ?? null,
    song_key: s.song_key ?? null,
    bible_verse: s.bible_verse ?? null,
    background_story: s.background_story ?? null,
    lyrics: s.lyrics,
  }));

  await supabase.from('songs').insert(rows);
}
