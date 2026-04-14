import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { SongForm } from '@/components/leader/SongForm';
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/lib/supabase';

export default function CreateSongScreen() {
  const deviceId = useUserStore((s) => s.deviceId);

  return (
    <View style={{ flex: 1 }}>
      <SongForm
        onSubmit={async (payload) => {
          if (!deviceId?.trim()) {
            Alert.alert('오류', '기기 정보가 없습니다. 온보딩을 다시 진행해 주세요.');
            return;
          }
          const { error } = await supabase.rpc('insert_song_for_leader', {
            p_title: payload.title.trim(),
            p_lyrics: payload.lyrics,
            p_created_by: deviceId,
          });
          if (error) {
            const msg =
              typeof error.message === 'string' && error.message.length > 0
                ? error.message
                : '찬양을 저장하지 못했습니다.';
            Alert.alert('오류', msg);
            throw error;
          }
          router.back();
        }}
      />
    </View>
  );
}
