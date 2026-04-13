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
          const { error } = await supabase.from('songs').insert({
            title: payload.title,
            artist: payload.artist ?? null,
            background_story: payload.background_story ?? null,
            bible_verse: payload.bible_verse ?? null,
            lyrics: payload.lyrics,
            created_by: deviceId ?? null,
          });
          if (error) {
            Alert.alert('오류', '찬양을 저장하지 못했습니다.');
            throw error;
          }
          router.back();
        }}
      />
    </View>
  );
}
