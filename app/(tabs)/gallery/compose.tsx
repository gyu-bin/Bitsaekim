import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { insertGalleryPostAfterUpload } from '@/lib/galleryInsert';
import { pickAndUploadImage } from '@/lib/image';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function GalleryComposeScreen() {
  const { worshipId: worshipIdRaw, songId: songIdRaw } = useLocalSearchParams<{
    worshipId?: string;
    songId?: string;
  }>();
  const worshipId = normalizeParam(worshipIdRaw);
  const songId = normalizeParam(songIdRaw);

  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();

  const { data: worships } = useWorships();
  const worshipName = useMemo(
    () => worships?.find((w) => w.id === worshipId)?.name,
    [worships, worshipId]
  );

  const { data: song, isLoading: songLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      const { data, error } = await supabase.from('songs').select('title').eq('id', songId!).single();
      if (error) throw error;
      return data as { title: string };
    },
    enabled: !!songId,
  });

  const [postId] = useState(() => uuidv4());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    if (!deviceId) {
      Alert.alert('안내', '기기 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진을 올리려면 사진 라이브러리 접근을 허용해 주세요.');
      return;
    }
    setPicking(true);
    try {
      const url = await pickAndUploadImage(deviceId, postId);
      if (!url) {
        Alert.alert('안내', '이미지를 가져오지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      setImageUrl(url);
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    if (!deviceId || !imageUrl) return;
    setSubmitting(true);
    try {
      const trimmed = body.trim();
      const result = await insertGalleryPostAfterUpload({
        postId,
        deviceId,
        worshipId: worshipId ?? null,
        songId: songId ?? null,
        imagePublicUrl: imageUrl,
        body: trimmed.length > 0 ? trimmed : null,
      });
      if (!result.ok) throw new Error(result.message);
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      Alert.alert('올렸어요', '나눔에 사진이 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
          ? e.message
          : '등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (songId && songLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.lead, { color: c.text }]}>
        필사 기록은 이미 저장되어 있어요. 같은 곡·예배로 나눔을 여러 번 올리면 글이 각각 생깁니다.
      </Text>
      <Text style={[styles.subLead, { color: c.textSub }]}>
        다른 사진을 올리려면 아래에서 선택하세요. 손글씨·타자 화면 캡처, 노트 촬영 등도 가능해요. 묵상은 아래에 적을 수 있어요.
      </Text>

      {(worshipName || song?.title) && (
        <View style={[styles.contextCard, { borderColor: c.border, backgroundColor: c.card }]}>
          {worshipName ? (
            <Text style={[styles.contextLine, { color: c.text }]} numberOfLines={2}>
              예배 · {worshipName}
            </Text>
          ) : null}
          {song?.title ? (
            <Text style={[styles.contextLine, { color: c.textSub }]} numberOfLines={2}>
              곡 · {song.title}
            </Text>
          ) : null}
        </View>
      )}

      <View style={[styles.previewBox, { borderColor: c.border, backgroundColor: c.card }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.preview} contentFit="contain" />
        ) : (
          <Text style={[styles.previewPlaceholder, { color: c.textSub }]}>아직 선택한 사진이 없어요</Text>
        )}
      </View>

      <Text style={[styles.bodyLabel, { color: c.textSub }]}>묵상·느낀 점 (선택)</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="필사·묵상에서 든 생각을 나눠 보세요."
        placeholderTextColor={c.textSub}
        multiline
        textAlignVertical="top"
        style={[
          styles.bodyInput,
          { borderColor: c.border, color: c.text, backgroundColor: c.card },
        ]}
      />

      <Button
        title={imageUrl ? '다른 사진으로 바꾸기' : '사진·앨범에서 가져오기'}
        variant="outline"
        onPress={() => void pickImage()}
        loading={picking}
        disabled={picking || submitting}
        containerStyle={styles.btn}
      />
      <Button
        title="나눔에 올리기"
        onPress={() => void submit()}
        loading={submitting}
        disabled={!imageUrl || submitting || picking}
        containerStyle={styles.btn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lead: {
    ...typeface.sans,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  subLead: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 10,
  },
  contextCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contextLine: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  previewBox: {
    marginTop: 20,
    minHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    minHeight: 220,
  },
  previewPlaceholder: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    padding: 24,
    textAlign: 'center',
  },
  bodyLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    marginTop: 16,
    marginBottom: 6,
  },
  bodyInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    minHeight: 96,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: { marginTop: 12 },
});
