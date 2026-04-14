import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { insertGalleryPostWithLocalImage, updateGalleryPostBody } from '@/lib/galleryInsert';
import { useUserStore } from '@/stores/userStore';

type Props = {
  visible: boolean;
  imageUri: string | null;
  worshipId: string | undefined;
  songId: string | undefined;
  songTitle?: string;
  /** 필사 완료 직후 사진 보관함에 자동 저장된 경우 */
  didAutoSaveToAlbum?: boolean;
  /** 필사 완료 시 이미 업로드·등록된 나눔 글 id (묵상만 갱신) */
  existingGalleryPostId?: string | null;
  onClose: () => void;
  onPosted: () => void;
};

function toFileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function TranscribeShareToGallerySheet({
  visible,
  imageUri,
  worshipId,
  songId,
  songTitle,
  didAutoSaveToAlbum,
  existingGalleryPostId,
  onClose,
  onPosted,
}: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setBody('');
  }, [visible]);

  const deleteTemp = useCallback(async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      /* noop */
    }
  }, []);

  const handleSkip = useCallback(async () => {
    await deleteTemp(imageUri);
    onClose();
  }, [deleteTemp, imageUri, onClose]);

  const handlePost = useCallback(async () => {
    if (!imageUri || !worshipId || !songId || !deviceId) {
      Alert.alert('알림', '나눔을 올리려면 예배·곡 정보와 기기 정보가 필요해요.');
      return;
    }
    setBusy(true);
    try {
      if (existingGalleryPostId) {
        const result = await updateGalleryPostBody({
          postId: existingGalleryPostId,
          deviceId,
          body: body.trim() || null,
        });
        if (!result.ok) {
          Alert.alert('오류', result.message);
          return;
        }
      } else {
        const result = await insertGalleryPostWithLocalImage({
          deviceId,
          worshipId,
          songId,
          localFileUri: toFileUri(imageUri),
          body,
        });
        if (!result.ok) {
          Alert.alert('오류', result.message);
          return;
        }
      }
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      await qc.invalidateQueries({ queryKey: ['transcription-stats'] });
      await deleteTemp(imageUri);
      onPosted();
    } finally {
      setBusy(false);
    }
  }, [body, deleteTemp, deviceId, existingGalleryPostId, imageUri, onPosted, qc, songId, worshipId]);

  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => void handleSkip()}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={() => void handleSkip()} accessibilityLabel="닫기" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.card, borderColor: c.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Text style={[styles.title, { color: c.text }]}>나눔에 올리기</Text>
          {songTitle ? (
            <Text style={[styles.sub, { color: c.textSub }]} numberOfLines={2}>
              {songTitle}
            </Text>
          ) : null}
          {existingGalleryPostId ? (
            <Text style={[styles.albumNote, { color: c.textMid }]}>
              필사 화면은 이미 나눔에 올라갔어요. 묵상만 추가·저장할 수 있어요.
            </Text>
          ) : null}
          {didAutoSaveToAlbum ? (
            <Text style={[styles.albumNote, { color: c.textMid }]}>
              마지막 절 화면은 사진 보관함에도 저장했어요.
            </Text>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.previewWrap, { borderColor: c.border, backgroundColor: c.background }]}>
              <Image source={{ uri: toFileUri(imageUri) }} style={styles.preview} contentFit="contain" />
            </View>

            <Text style={[styles.label, { color: c.textSub }]}>묵상·느낀 점 (선택)</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="필사하면서 든 생각을 나눠 보세요."
              placeholderTextColor={c.textSub}
              multiline
              textAlignVertical="top"
              style={[
                styles.bodyInput,
                { borderColor: c.border, color: c.text, backgroundColor: c.background },
              ]}
            />
          </ScrollView>

          <View style={styles.actions}>
            <Button title="건너뛰기" variant="outline" onPress={() => void handleSkip()} disabled={busy} />
            <View style={{ flex: 1, minWidth: 8 }} />
            <Button
              title={existingGalleryPostId ? '묵상 저장' : '나눔에 올리기'}
              onPress={() => void handlePost()}
              loading={busy}
              disabled={busy}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '88%',
  },
  title: { ...typeface.sansMedium, fontSize: fontSize.lg, marginBottom: 4 },
  sub: { ...typeface.sans, fontSize: fontSize.sm, marginBottom: 12 },
  albumNote: { ...typeface.sans, fontSize: fontSize.xs, lineHeight: 18, marginBottom: 10 },
  previewWrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 160,
    maxHeight: 260,
  },
  preview: { width: '100%', minHeight: 160, maxHeight: 260 },
  label: { ...typeface.sansMedium, fontSize: fontSize.sm, marginTop: 14, marginBottom: 6 },
  bodyInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    minHeight: 100,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
});
