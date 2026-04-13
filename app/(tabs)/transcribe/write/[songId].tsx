import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandwritingCanvas } from '@/components/transcribe/HandwritingCanvas';
import { LyricsPanel } from '@/components/transcribe/LyricsPanel';
import { TypingCanvas } from '@/components/transcribe/TypingCanvas';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize } from '@/constants/fonts';
import { useRecordTranscription } from '@/hooks/useTranscription';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import type { LyricVerse, TranscribeMode } from '@/types';

export default function WriteSongScreen() {
  const { songId, worshipId, mode: modeParam } = useLocalSearchParams<{
    songId: string;
    worshipId: string;
    mode: TranscribeMode;
  }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const mode: TranscribeMode = modeParam === 'handwriting' ? 'handwriting' : 'typing';

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
  const recordTx = useRecordTranscription();

  useLayoutEffect(() => {
    if (song?.title) {
      navigation.setOptions({ title: song.title });
    }
  }, [navigation, song?.title]);

  const current = verses[verseIndex];
  const total = verses.length;
  const progress = total > 0 ? (verseIndex + 1) / total : 0;

  const finish = useCallback(async () => {
    if (!songId || !worshipId) return;
    try {
      await recordTx.mutateAsync({ worshipId, songId, mode });
      Alert.alert('필사 완료', '나눔 탭에 사진을 올려 공유해 보세요.', [
        { text: '나눔으로', onPress: () => router.replace('/(tabs)/gallery') },
        { text: '닫기', style: 'cancel', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('오류', '필사 기록 저장에 실패했습니다.');
    }
  }, [mode, recordTx, songId, worshipId]);

  const goNext = () => {
    if (verseIndex < total - 1) {
      setVerseIndex((i) => i + 1);
    } else {
      void finish();
    }
  };

  const bar = useMemo(
    () => (
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
      </View>
    ),
    [c.accent, progress]
  );

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
        <TypingCanvas verseKey={`${songId}-${verseIndex}`} />
      ) : (
        <HandwritingCanvas />
      )}
      <Button
        title={verseIndex < total - 1 ? '다음 절로 →' : '✨ 필사 완료!'}
        onPress={goNext}
        containerStyle={{ marginTop: 16 }}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom }]}>
      {bar}

      {isWide ? (
        <View style={styles.split}>
          <View style={styles.col}>{lyricsBlock}</View>
          <View style={styles.col}>{workBlock}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          {lyricsBlock}
          {workBlock}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTrack: {
    height: 4,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  split: { flex: 1, flexDirection: 'row' },
  col: { flex: 1, padding: 12 },
  stack: { flex: 1, padding: 16, gap: 16 },
  lyricsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    maxHeight: 280,
  },
  work: { flex: 1 },
});
