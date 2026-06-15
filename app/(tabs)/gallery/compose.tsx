import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
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

import { LocalImagePreview } from '@/components/gallery/LocalImagePreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { radius } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { insertGalleryPostAfterUpload } from '@/lib/galleryInsert';
import { refreshGalleryCache } from '@/lib/galleryQuery';
import { pickGalleryImageUri, uploadGalleryJpegFromUri } from '@/lib/image';
import { completeGalleryPost } from '@/lib/galleryPostSuccess';
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
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
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
      const uri = await pickGalleryImageUri();
      if (!uri) return;
      setLocalImageUri(uri);
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    if (!deviceId || !localImageUri) return;
    setSubmitting(true);
    try {
      const imagePublicUrl = await uploadGalleryJpegFromUri(deviceId, postId, localImageUri);
      if (!imagePublicUrl) {
        Alert.alert('오류', '이미지를 업로드하지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      const trimmed = body.trim();
      const result = await insertGalleryPostAfterUpload({
        postId,
        deviceId,
        worshipId: worshipId ?? null,
        songId: songId ?? null,
        imagePublicUrl,
        body: trimmed.length > 0 ? trimmed : null,
      });
      if (!result.ok) throw new Error(result.message);
      await refreshGalleryCache(qc);
      completeGalleryPost('나눔에 사진을 올렸어요');
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
      <Card style={styles.infoCard} elevated={false}>
        <Text style={[styles.lead, { color: c.text }]}>
          필사 기록은 이미 저장되어 있어요. 같은 곡·예배로 여러 번 올릴 수 있어요.
        </Text>
        <Text style={[styles.subLead, { color: c.textSub }]}>
          손글씨·화면 캡처·노트 사진을 골라 묵상과 함께 나눠 보세요.
        </Text>
      </Card>

      {(worshipName || song?.title) && (
        <Card style={styles.contextCard}>
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
        </Card>
      )}

      <Card style={styles.previewCard} padded={false}>
        <LocalImagePreview
          uri={localImageUri}
          placeholder="탭해서 사진을 선택하세요"
          placeholderTextColor={c.textSub}
          borderColor="transparent"
          backgroundColor={c.surface}
          maxHeightRatio={0.62}
          minHeight={240}
        />
      </Card>

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
        title={localImageUri ? '다른 사진으로 바꾸기' : '사진·앨범에서 가져오기'}
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
        disabled={!localImageUri || submitting || picking}
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
    marginTop: 8,
  },
  infoCard: { marginBottom: 12 },
  contextCard: { marginBottom: 12 },
  contextLine: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  previewCard: { marginBottom: 4, overflow: 'hidden' },
  bodyLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    minHeight: 104,
    maxHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btn: { marginTop: 12 },
});
