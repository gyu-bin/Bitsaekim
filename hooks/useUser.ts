import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types';

export function useRemoteUser() {
  const deviceId = useUserStore((s) => s.deviceId);

  return useQuery({
    queryKey: ['user', deviceId],
    queryFn: async (): Promise<User | null> => {
      if (!deviceId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (error) throw error;
      return data as User | null;
    },
    enabled: !!deviceId,
  });
}
