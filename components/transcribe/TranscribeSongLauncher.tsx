import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { ModeSelector } from '@/components/transcribe/ModeSelector';
import { SetlistTimeline } from '@/components/transcribe/SetlistTimeline';
import { Button } from '@/components/ui/Button';
import type { SetlistItem, TranscribeMode } from '@/types';

type Props = {
  worshipId: string;
  items: SetlistItem[];
  /** 곡만 순서대로 (특송 등 제외) */
  songQueueIds: string[];
};

/**
 * 곡 탭 → 모드 선택 → 필사 화면.
 * `처음부터` 시 콘티 순서 전체를 `queue`로 넘겨 곡 단위로 이어서 필사합니다.
 */
export function TranscribeSongLauncher({ worshipId, items, songQueueIds }: Props) {
  const [modeOpen, setModeOpen] = useState(false);
  const [pending, setPending] = useState<SetlistItem | null>(null);
  const pendingRef = useRef<SetlistItem | null>(null);
  const useFullQueueAfterPickRef = useRef(false);

  const firstSongItem = useMemo(
    () => items.find((i) => !i.is_special && i.song_id),
    [items]
  );

  const openWrite = useCallback(
    (item: SetlistItem, mode: TranscribeMode, withFullQueue: boolean) => {
      if (!item.song_id) return;
      const queue =
        withFullQueue && songQueueIds.length > 0 ? songQueueIds.join(',') : undefined;
      router.push({
        pathname: '/(tabs)/transcribe/write/[songId]',
        params: queue
          ? { songId: item.song_id, worshipId, mode, queue }
          : { songId: item.song_id, worshipId, mode },
      });
    },
    [worshipId, songQueueIds]
  );

  const onPickMode = useCallback(
    (mode: TranscribeMode) => {
      const p = pendingRef.current;
      if (p) openWrite(p, mode, useFullQueueAfterPickRef.current);
      useFullQueueAfterPickRef.current = false;
      pendingRef.current = null;
      setPending(null);
    },
    [openWrite]
  );

  const pickSongForMode = useCallback((item: SetlistItem) => {
    pendingRef.current = item;
    setPending(item);
    setModeOpen(true);
  }, []);

  const startFromBeginning = useCallback(() => {
    if (!firstSongItem) return;
    useFullQueueAfterPickRef.current = true;
    pendingRef.current = firstSongItem;
    setPending(firstSongItem);
    setModeOpen(true);
  }, [firstSongItem]);

  return (
    <>
      <SetlistTimeline
        items={items}
        onSongPress={(item) => {
          if (!item.song_id) return;
          useFullQueueAfterPickRef.current = false;
          pickSongForMode(item);
        }}
      />
      {!!firstSongItem && (
        <Button title="처음부터 필사 시작" onPress={startFromBeginning} containerStyle={{ marginTop: 20 }} />
      )}
      <ModeSelector
        visible={modeOpen}
        onClose={() => {
          setModeOpen(false);
          pendingRef.current = null;
          setPending(null);
          useFullQueueAfterPickRef.current = false;
        }}
        onSelect={onPickMode}
      />
    </>
  );
}
