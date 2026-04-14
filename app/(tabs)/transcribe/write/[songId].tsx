import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandwritingCanvas } from '@/components/transcribe/HandwritingCanvas';
import { TranscribeShareToGallerySheet } from '@/components/transcribe/TranscribeShareToGallerySheet';
import { LyricsPanel } from '@/components/transcribe/LyricsPanel';
import { TypingCanvas } from '@/components/transcribe/TypingCanvas';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, typeface } from '@/constants/fonts';
import { useRecordTranscription } from '@/hooks/useTranscription';
import { useThemeColors } from '@/hooks/useThemeColors';
import { insertGalleryPostWithLocalImage } from '@/lib/galleryInsert';
import { persistPreviewAfterTranscriptionComplete } from '@/lib/transcriptionLocalPreview';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { LyricVerse, TranscribeMode, TranscriptionWorkCaptureHandle } from '@/types';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function isRlsPermissionError(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String(err.code ?? '') : '';
  const msg = 'message' in err ? String(err.message ?? '').toLowerCase() : '';
  return code === '42501' || msg.includes('row-level security') || msg.includes('permission');
}

function toFileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export default function WriteSongScreen() {
  const { songId: songIdRaw, worshipId: worshipIdRaw, mode: modeRaw, queue: queueRaw } =
    useLocalSearchParams<{
      songId: string;
      worshipId: string;
      mode: TranscribeMode;
      queue?: string;
    }>();

  const songId = normalizeParam(songIdRaw);
  const worshipId = normalizeParam(worshipIdRaw);
  const modeParam = normalizeParam(modeRaw);
  const queueParam = normalizeParam(queueRaw);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const mode: TranscribeMode = modeParam === 'handwriting' ? 'handwriting' : 'typing';

  const queueIds = useMemo(
    () => (queueParam ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    [queueParam]
  );

  const queueIndex = songId ? queueIds.indexOf(songId) : -1;
  const inOrderedQueue = queueIds.length > 1 && queueIndex >= 0;
  const hasNextSongInQueue = inOrderedQueue && queueIndex < queueIds.length - 1;

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      const { data, error } = await supabase.from('songs').select('*').eq('id', songId!).single();
      if (error) throw error;
      return data as {
        title: string;
        lyrics: LyricVerse[];
        background_story?: string;
        bible_verse?: string;
      };
    },
    enabled: !!songId,
  });

  const verses = song?.lyrics ?? [];
  const [verseIndex, setVerseIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const recordTx = useRecordTranscription();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const hwRef = useRef<TranscriptionWorkCaptureHandle>(null);
  const typingRef = useRef<TranscriptionWorkCaptureHandle>(null);
  const [shareToGalleryUri, setShareToGalleryUri] = useState<string | null>(null);
  const [shareToGalleryOpen, setShareToGalleryOpen] = useState(false);
  const [shareToGalleryAlbumSaved, setShareToGalleryAlbumSaved] = useState(false);
  /** 필사 완료 직후 자동 업로드된 나눔 글 id (시트에서 묵상만 갱신) */
  const [autoGalleryPostId, setAutoGalleryPostId] = useState<string | null>(null);

  useEffect(() => {
    setVerseIndex(0);
  }, [songId]);

  useLayoutEffect(() => {
    if (song?.title) {
      navigation.setOptions({ title: song.title });
    }
  }, [navigation, song?.title]);

  const current = verses[verseIndex];
  const total = verses.length;
  const progress = total > 0 ? (verseIndex + 1) / total : 0;

  const shareWorkImage = useCallback(async () => {
    const cap = mode === 'handwriting' ? hwRef.current : typingRef.current;
    if (!cap) return;
    const uri = await cap.captureToTempJpeg();
    if (!uri) {
      Alert.alert(
        '안내',
        mode === 'typing'
          ? '글자를 입력한 뒤 다시 시도해 주세요.'
          : '필기가 있을 때만 공유할 수 있어요.'
      );
      return;
    }
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(toFileUri(uri));
      } else {
        Alert.alert('안내', '이 기기에서는 공유를 지원하지 않습니다.');
      }
    } catch {
      Alert.alert('오류', '공유에 실패했습니다.');
    } finally {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        /* noop */
      }
    }
  }, [mode]);

  const saveWorkToLibrary = useCallback(async () => {
    const cap = mode === 'handwriting' ? hwRef.current : typingRef.current;
    if (!cap) return;
    const uri = await cap.captureToTempJpeg();
    if (!uri) {
      Alert.alert(
        '안내',
        mode === 'typing'
          ? '글자를 입력한 뒤 다시 시도해 주세요.'
          : '필기가 있을 때만 저장할 수 있어요.'
      );
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 보관함에 저장하려면 권한이 필요합니다.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(toFileUri(uri));
      Alert.alert('저장됨', '사진 보관함에 저장했어요.');
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        /* noop */
      }
    }
  }, [mode]);

  const showCompleteAlert = useCallback(() => {
    const composeParams =
      worshipId || songId
        ? {
            pathname: '/(tabs)/gallery/compose' as const,
            params: {
              ...(worshipId ? { worshipId } : {}),
              ...(songId ? { songId } : {}),
            },
          }
        : { pathname: '/(tabs)/gallery/compose' as const };

    Alert.alert(
      '필사 완료',
      '필사 기록이 저장됐어요. 캡처가 비어 있으면 아래에서 사진을 골라 나눔에 올릴 수 있어요.',
      [
        { text: '나눔에 올리기', onPress: () => router.push(composeParams) },
        { text: '나눔 둘러보기', onPress: () => router.push('/(tabs)/gallery') },
        { text: '닫기', style: 'cancel', onPress: () => router.back() },
      ]
    );
  }, [songId, worshipId]);

  const closeShareToGallery = useCallback(() => {
    setShareToGalleryOpen(false);
    setShareToGalleryUri(null);
    setShareToGalleryAlbumSaved(false);
    setAutoGalleryPostId(null);
    router.back();
  }, []);

  const onShareToGalleryPosted = useCallback(() => {
    setShareToGalleryOpen(false);
    setShareToGalleryUri(null);
    setShareToGalleryAlbumSaved(false);
    setAutoGalleryPostId(null);
    Alert.alert('나눔에 올렸어요', '필사 화면과 글이 등록됐어요.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  }, []);

  const goNextSongInQueue = useCallback(() => {
    if (!songId || !worshipId) return false;
    const idx = queueIds.indexOf(songId);
    if (idx >= 0 && idx < queueIds.length - 1) {
      const nextId = queueIds[idx + 1];
      router.replace({
        pathname: '/(tabs)/transcribe/write/[songId]',
        params: {
          songId: nextId,
          worshipId,
          mode,
          queue: queueIds.join(','),
        },
      });
      return true;
    }
    return false;
  }, [mode, queueIds, songId, worshipId]);

  const moveToQueueSong = useCallback(
    (targetIndex: number) => {
      if (!songId || !worshipId) return;
      if (targetIndex < 0 || targetIndex >= queueIds.length) return;
      const targetSongId = queueIds[targetIndex];
      if (!targetSongId || targetSongId === songId) return;
      router.replace({
        pathname: '/(tabs)/transcribe/write/[songId]',
        params: {
          songId: targetSongId,
          worshipId,
          mode,
          queue: queueIds.join(','),
        },
      });
    },
    [mode, queueIds, songId, worshipId]
  );

  const goNext = useCallback(async () => {
    if (verseIndex < total - 1) {
      setVerseIndex((i) => i + 1);
      return;
    }
    if (!songId || !worshipId) return;
    setSaving(true);
    let completionCaptureUri: string | null = null;
    try {
      await recordTx.mutateAsync({ worshipId, songId, mode });

      if (Platform.OS !== 'web') {
        const cap = mode === 'handwriting' ? hwRef.current : typingRef.current;
        completionCaptureUri = cap ? await cap.captureToTempJpeg() : null;
      }

      if (completionCaptureUri && Platform.OS !== 'web' && deviceId) {
        await persistPreviewAfterTranscriptionComplete(deviceId, worshipId, songId, completionCaptureUri);
      }

      let savedAlbum = false;
      if (completionCaptureUri && Platform.OS !== 'web') {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync(true);
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(toFileUri(completionCaptureUri));
            savedAlbum = true;
          }
        } catch {
          /* 자동 저장 실패는 나눔 시트·수동 저장으로 이어갈 수 있음 */
        }
      }

      let autoPostedId: string | null = null;
      if (
        completionCaptureUri &&
        Platform.OS !== 'web' &&
        deviceId &&
        worshipId &&
        songId
      ) {
        const autoRes = await insertGalleryPostWithLocalImage({
          deviceId,
          worshipId,
          songId,
          localFileUri: toFileUri(completionCaptureUri),
          body: null,
        });
        if (autoRes.ok) {
          autoPostedId = autoRes.postId;
          await qc.invalidateQueries({ queryKey: ['gallery'] });
          await qc.invalidateQueries({ queryKey: ['transcription-stats'] });
          await qc.invalidateQueries({ queryKey: ['gallery-mine-for-song', deviceId, worshipId, songId] });
        }
      }
      setAutoGalleryPostId(autoPostedId);

      if (goNextSongInQueue()) {
        if (completionCaptureUri) {
          try {
            await FileSystem.deleteAsync(completionCaptureUri, { idempotent: true });
          } catch {
            /* noop */
          }
        }
        return;
      }

      if (Platform.OS === 'web') {
        showCompleteAlert();
        return;
      }

      if (completionCaptureUri) {
        setShareToGalleryAlbumSaved(savedAlbum);
        setShareToGalleryUri(completionCaptureUri);
        setShareToGalleryOpen(true);
      } else {
        showCompleteAlert();
      }
    } catch (err) {
      if (completionCaptureUri) {
        try {
          await FileSystem.deleteAsync(completionCaptureUri, { idempotent: true });
        } catch {
          /* noop */
        }
      }
      if (isRlsPermissionError(err)) {
        if (goNextSongInQueue()) {
          Alert.alert('안내', '필사 기록 저장 권한이 없어 기록은 건너뛰고 다음 곡으로 이동합니다.');
          return;
        }
        Alert.alert('안내', '필사 기록 저장 권한이 없어 기록은 건너뛰고 완료 처리합니다.');
        showCompleteAlert();
        return;
      }
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : '필사 기록 저장에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSaving(false);
    }
  }, [
    verseIndex,
    total,
    songId,
    worshipId,
    mode,
    recordTx,
    showCompleteAlert,
    goNextSongInQueue,
    deviceId,
  ]);

  const bar = useMemo(
    () => (
      <View style={styles.barWrap}>
        {inOrderedQueue ? (
          <View>
            <Text style={[styles.queueHint, { color: c.textSub }]}>
              연속 필사 {queueIndex + 1}/{queueIds.length}
              {hasNextSongInQueue ? ' · 마지막 절에서 완료 시 다음 곡' : ''}
            </Text>
            <View style={styles.queueNavRow}>
              <Button
                title="이전"
                variant="outline"
                disabled={queueIndex <= 0 || saving}
                onPress={() => moveToQueueSong(queueIndex - 1)}
                containerStyle={
                  queueIndex >= queueIds.length - 1
                    ? { ...styles.queueNavChip, ...styles.queueNavChipSingle }
                    : styles.queueNavChip
                }
                textStyle={styles.queueNavChipText}
              />
              {queueIndex < queueIds.length - 1 ? (
                <Button
                  title="다음"
                  variant="outline"
                  disabled={saving}
                  onPress={() => moveToQueueSong(queueIndex + 1)}
                  containerStyle={styles.queueNavChip}
                  textStyle={styles.queueNavChipText}
                />
              ) : null}
            </View>
          </View>
        ) : null}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
        </View>
      </View>
    ),
    [c.accent, c.textSub, hasNextSongInQueue, inOrderedQueue, progress, queueIds.length, queueIndex, saving]
  );

  const primaryButtonTitle =
    verseIndex < total - 1
      ? '다음 절로 →'
      : hasNextSongInQueue
        ? `다음 곡으로 → (${queueIndex + 1}/${queueIds.length} 완료)`
        : '✨ 필사 완료!';

  if (isLoading || !song) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, padding: 20 }]}>
        <Text style={{ color: c.text }}>가사 데이터가 없습니다.</Text>
      </View>
    );
  }

  const lyricsBlock = (
    <View style={[styles.lyricsBox, { borderColor: c.border }]}>
      <LyricsPanel
        verse={current}
        backgroundStory={song.background_story}
        bibleVerse={song.bible_verse}
        compact={!isWide}
      />
    </View>
  );

  const workBlock = (
    <View style={styles.work}>
      {mode === 'typing' ? (
        <TypingCanvas ref={typingRef} verseKey={`${songId}-${verseIndex}`} />
      ) : (
        <HandwritingCanvas ref={hwRef} verseKey={`${songId}-${verseIndex}`} />
      )}
      {Platform.OS !== 'web' ? (
        <View style={styles.workActions}>
          <Pressable
            onPress={() => void shareWorkImage()}
            style={({ pressed }) => [
              styles.workActionBtn,
              { borderColor: c.border, backgroundColor: c.card },
              pressed && styles.workActionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="필사 화면 공유"
          >
            <Feather name="share-2" size={18} color={c.accent} />
            <Text style={[styles.workActionLabel, { color: c.text }]}>공유</Text>
          </Pressable>
          <Pressable
            onPress={() => void saveWorkToLibrary()}
            style={({ pressed }) => [
              styles.workActionBtn,
              { borderColor: c.border, backgroundColor: c.card },
              pressed && styles.workActionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="필사 화면을 사진 보관함에 저장"
          >
            <Feather name="download" size={18} color={c.accent} />
            <Text style={[styles.workActionLabel, { color: c.text }]}>앨범 저장</Text>
          </Pressable>
        </View>
      ) : null}
      {verseIndex >= total - 1 && hasNextSongInQueue ? (
        <Text style={[styles.lastVerseHint, { color: c.textMid }]}>
          이 절까지 저장한 뒤, 같은 버튼을 누르면 다음 곡 가사로 넘어가요.
        </Text>
      ) : null}
      <Button
        title={primaryButtonTitle}
        onPress={() => void goNext()}
        loading={saving}
        disabled={saving}
        containerStyle={{ marginTop: 16 }}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom }]}>
      <TranscribeShareToGallerySheet
        visible={shareToGalleryOpen && !!shareToGalleryUri}
        imageUri={shareToGalleryUri}
        worshipId={worshipId}
        songId={songId}
        songTitle={song?.title}
        didAutoSaveToAlbum={shareToGalleryAlbumSaved}
        existingGalleryPostId={autoGalleryPostId}
        onClose={closeShareToGallery}
        onPosted={onShareToGalleryPosted}
      />
      {bar}

      {isWide ? (
        <View style={styles.split}>
          <View style={[styles.col, styles.lyricsCol]}>{lyricsBlock}</View>
          <View style={[styles.col, styles.workCol]}>{workBlock}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          <View style={styles.lyricsStack}>{lyricsBlock}</View>
          <View style={styles.workStack}>{workBlock}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barWrap: { marginHorizontal: 16 },
  queueHint: {
    ...typeface.sans,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 6,
    textAlign: 'center',
  },
  queueNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  queueNavChip: {
    flex: 1,
    maxWidth: 120,
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  queueNavChipSingle: {
    flex: 0,
    minWidth: 72,
    maxWidth: 120,
  },
  queueNavChipText: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
  },
  barTrack: {
    height: 4,
    marginTop: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  split: { flex: 1, flexDirection: 'row' },
  col: { flex: 1, padding: 12 },
  lyricsCol: { flex: 3 },
  workCol: { flex: 7 },
  stack: { flex: 1, padding: 16, gap: 10 },
  lyricsStack: { flex: 3, minHeight: 120 },
  workStack: { flex: 7, minHeight: 220 },
  lyricsBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  work: { flex: 1 },
  workActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
  },
  workActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  workActionPressed: { opacity: 0.75 },
  workActionLabel: { ...typeface.sansMedium, fontSize: fontSize.sm },
  lastVerseHint: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
