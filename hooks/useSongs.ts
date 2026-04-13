import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Song } from '@/types';

export function useSongsSearch(q: string) {
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  return useQuery({
    queryKey: ['songs-search', debounced],
    queryFn: async () => {
      let req = supabase.from('songs').select('*').order('title').limit(40);
      if (debounced.length > 0) {
        req = req.or(`title.ilike.%${debounced}%,artist.ilike.%${debounced}%`);
      }
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as Song[];
    },
  });
}
