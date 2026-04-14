import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import {
  useMyGalleryPostsForWorshipSong,
  useTranscriptionById,
} from '@/hooks/useTranscription';
import { useThemeColors } from '@/hooks/useThemeColors';
import { insertGalleryDuplicateFromSourceUrl } from '@/lib/galleryInsert';
import { getTranscriptionPreviewFileUri } from '@/lib/transcriptionLocalPreview';
import { useUserStore } from '@/stores/userStore';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function TranscriptionDetailScreen() {
  const { id: idRaw } = useLocalSearchParams<{ id: string }>();
  const id = normalizeParam(idRaw);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();

  const { data: row, isLoading: rowLoading } = useTranscriptionById(id);
  const { data: galleryRows, isLoading: galleryLoading } = useMyGalleryPostsForWorshipSong(
    row?.worship_id,
    row?.song_id,
    !!row
  );

  const preview = useMemo(
    () => (galleryRows ?? []).find((p) => p.image_url?.startsWith('http')) ?? null,
    [galleryRows]
  );

  const [dupBusy, setDupBusy] = useState(false);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);

  const loadLocalPreview = useCallback(async () => {
    if (!id) {
      setLocalPreviewUri(null);
      return;
    }
    const u = await getTranscriptionPreviewFileUri(id);
    setLocalPreviewUri(u);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadLocalPreview();
    }, [loadLocalPreview])
  );

  const goCompose = useCallback(() => {
    if (!row?.worship_id || !row?.song_id) return;
    router.push({
      pathname: '/(tabs)/gallery/compose',
      params: { worshipId: row.worship_id, songId: row.song_id },
    });
  }, [row?.song_id, row?.worship_id]);

  const goWrite = useCallback(() => {
    if (!row?.worship_id || !row?.song_id) return;
    router.push({
      pathname: '/(tabs)/transcribe/write/[songId]',
      params: {
        songId: row.song_id,
        worshipId: row.worship_id,
        mode: row.mode,
      },
    });
  }, [row]);

  const duplicateToGallery = useCallback(async () => {
    if (!deviceId || !row?.worship_id || !row?.song_id || !preview?.image_url) return;
    setDupBusy(true);
    try {
      const result = await insertGalleryDuplicateFromSourceUrl({
        deviceId,
        worshipId: row.worship_id,
        songId: row.song_id,
        sourcePublicUrl: preview.image_url,
        body: preview.body,
      });
      if (!result.ok) {
        Alert.alert('안내', result.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      await qc.invalidateQueries({ queryKey: ['transcription-stats'] });
      await qc.invalidateQueries({ queryKey: ['gallery-mine-for-song', deviceId, row.worship_id, row.song_id] });
      Alert.alert('올렸어요', '같은 사진으로 새 나눔 글이 등록됐어요.');
    } finally {
      setDupBusy(false);
    }
  }, [deviceId, preview, qc, row?.song_id, row?.worship_id]);

  if (!id) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textSub }}>잘못된 링크예요</Text>
      </View>
    );
  }

  if (rowLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!row) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.miss, { color: c.textSub }]}>기록을 찾을 수 없어요</Text>
        <Button title="목록으로" variant="outline" onPress={() => router.back()} containerStyle={{ marginTop: 16 }} />
      </View>
    );
  }

  const d = new Date(row.completed_at);
  const dateLabel = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const modeLabel = row.mode === 'handwriting' ? '손글씨' : '타이핑';
  const title = row.song?.title ?? '곡 정보 없음';
  const artist = row.song?.artist?.trim();
  const worshipName = row.worship?.name;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }}
    >
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {artist ? (
        <Text style={[styles.artist, { color: c.textSub }]}>{artist}</Text>
      ) : null}
      {worshipName ? (
        <Text style={[styles.worship, { color: c.textSub }]}>{worshipName}</Text>
      ) : null}
      <Text style={[styles.meta, { color: c.textSub }]}>
        완료 {dateLabel} · {modeLabel}
      </Text>

      <View style={[styles.note, { borderColor: c.border, backgroundColor: c.card }]}>
        <Text style={[styles.noteText, { color: c.textMid }]}>
          필사 완료 시 마지막 절 화면은 이 기기에 JPEG로 저장돼요. 앱을 지우거나 다른 기기에서는 보이지 않을 수 있어요. 나눔에 올리면 모든 기기에서 볼 수 있어요.
        </Text>
      </View>

      {localPreviewUri ? (
        <View style={[styles.previewCard, { borderColor: c.border, backgroundColor: c.card }]}>
          <Text style={[styles.previewLabel, { color: c.textSub }]}>필사 완료 화면 (이 기기)</Text>
          <Pressable onPress={() => setLocalPreviewOpen(true)} accessibilityRole="button" accessibilityLabel="크게 보기">
            <Image source={{ uri: localPreviewUri }} style={styles.previewImg} contentFit="contain" />
          </Pressable>
          <Text style={[styles.previewHint, { color: c.textSub }]}>눌러 크게 보기</Text>
        </View>
      ) : (
        <Text style={[styles.noPreview, { color: c.textSub }]}>
          이 기기에 저장된 필사 이미지가 없어요. 필사를 다시 완료하면 마지막 절 화면이 저장돼요.
        </Text>
      )}

      <Modal
        visible={localPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLocalPreviewOpen(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: 'rgba(0,0,0,0.94)' }]}>
          <TouchableOpacity
            style={[styles.modalClose, { top: insets.top + 8 }]}
            onPress={() => setLocalPreviewOpen(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Pressable
            style={[styles.modalPress, { minHeight: winH }]}
            onPress={() => setLocalPreviewOpen(false)}
          >
            {localPreviewUri ? (
              <Image
                source={{ uri: localPreviewUri }}
                style={{ width: winW, height: winH * 0.88 }}
                contentFit="contain"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>

      {galleryLoading ? (
        <ActivityIndicator color={c.accent} style={{ marginVertical: 20 }} />
      ) : preview ? (
        <View style={[styles.previewCard, { borderColor: c.border, backgroundColor: c.card }]}>
          <Text style={[styles.previewLabel, { color: c.textSub }]}>나눔에 올린 필사</Text>
          <Image source={{ uri: preview.image_url! }} style={styles.previewImg} contentFit="contain" />
          {preview.body?.trim() ? (
            <Text style={[styles.previewBody, { color: c.textMid }]}>{preview.body.trim()}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/gallery', params: { filter: 'mine' } })}
            accessibilityRole="button"
          >
            <Text style={[styles.linkMine, { color: c.accent }]}>나눔 탭에서 내 글만 보기</Text>
          </TouchableOpacity>
        </View>
      ) : !localPreviewUri ? null : (
        <Text style={[styles.noPreview, { color: c.textSub }]}>
          나눔에는 아직 안 올렸어요. 아래에서 올릴 수 있어요.
        </Text>
      )}

      <Button title="나눔에 올리기 (사진·묵상)" onPress={goCompose} containerStyle={styles.btn} />
      {preview?.image_url ? (
        <Button
          title="이 사진으로 한 번 더 나눔에 올리기"
          variant="outline"
          onPress={() => void duplicateToGallery()}
          loading={dupBusy}
          disabled={dupBusy}
          containerStyle={styles.btn}
        />
      ) : null}
      <Button title="필사 화면 열기" variant="outline" onPress={goWrite} containerStyle={styles.btn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  miss: { ...typeface.sans, fontSize: fontSize.md, textAlign: 'center' },
  title: { ...typeface.serifBold, fontSize: fontSize.xl, lineHeight: 30 },
  artist: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 6 },
  worship: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4 },
  meta: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 10 },
  note: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteText: { ...typeface.sans, fontSize: fontSize.xs, lineHeight: 18 },
  previewCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  previewLabel: { ...typeface.sansMedium, fontSize: fontSize.sm, marginBottom: 8 },
  previewImg: { width: '100%', minHeight: 200, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)' },
  previewHint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 8, textAlign: 'center' },
  previewBody: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 10, lineHeight: 20 },
  linkMine: { ...typeface.sansMedium, fontSize: fontSize.xs, marginTop: 10 },
  noPreview: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 16, lineHeight: 20 },
  btn: { marginTop: 12 },
  modalRoot: { flex: 1 },
  modalClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modalCloseText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  modalPress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
