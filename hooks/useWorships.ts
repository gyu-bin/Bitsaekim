import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { WorshipService } from '@/types';

export function useWorships() {
  return useQuery({
    queryKey: ['worships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worship_services')
        .select('*')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorshipService[];
    },
  });
}
