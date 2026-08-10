import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SongSheetViewer } from '@/components/transcribe/SongSheetViewer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useSongsSearch } from '@/hooks/useSongs';
import {
  useSongSheets,
  useSongsWithSheets,
  useUploadSongSheet,
} from '@/hooks/useSongSheets';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/stores/userStore';

export default function ResourcesScreen() {
  const c = useThemeColors();
  const { horizontalGutter, insets, listBottomPadding } = useLayoutMetrics();
  const gatheringId = useUserStore((s) => s.gatheringId);
  const deviceId = useUserStore((s) => s.deviceId);
  const role = useUserStore((s) => s.role);
  const gatheringOwnerDeviceId = useUserStore((s) => s.gatheringOwnerDeviceId);
  const canUpload =
    role === 'leader' || (!!deviceId && !!gatheringOwnerDeviceId && deviceId === gatheringOwnerDeviceId);

  const { data: withSheets, isLoading, refetch, isRefetching } = useSongsWithSheets();
  const [q, setQ] = useState('');
  const { data: searchSongs } = useSongsSearch(q);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: sheets = [] } = useSongSheets(selectedSongId ?? undefined);
  const upload = useUploadSongSheet(selectedSongId ?? undefined);

  const list = useMemo(() => withSheets ?? [], [withSheets]);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: horizontalGutter }}>
        <ScreenHeader
          title="자료실"
          subtitle={gatheringId ? '모임 악보·곡 자료' : '등록된 악보'}
          rightAction={
            <IconButton icon="x" accessibilityLabel="닫기" onPress={() => router.back()} />
          }
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.song_id}
        contentContainerStyle={{
          paddingHorizontal: horizontalGutter,
          paddingBottom: listBottomPadding,
          gap: 8,
          flexGrow: 1,
        }}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Text style={[styles.hint, { color: c.textMid }]}>
              악보가 있는 곡 목록입니다. 리더는 아래에서 곡을 찾아 악보를 추가할 수 있어요.
            </Text>
            {canUpload ? (
              <>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="악보 올릴 곡 검색"
                  placeholderTextColor={c.textSub}
                  style={[
                    styles.search,
                    { borderColor: c.border, color: c.text, backgroundColor: c.card },
                  ]}
                />
                {(searchSongs ?? []).slice(0, 6).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      setSelectedSongId(s.id);
                      setSelectedTitle(s.title);
                    }}
                    style={[styles.row, { borderColor: c.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { color: c.text }]}>{s.title}</Text>
                      {s.artist ? (
                        <Text style={[styles.sub, { color: c.textSub }]}>{s.artist}</Text>
                      ) : null}
                    </View>
                    <Text style={{ color: c.accent, ...typeface.sansMedium, fontSize: fontSize.xs }}>
                      선택
                    </Text>
                  </Pressable>
                ))}
                {selectedSongId ? (
                  <View style={[styles.uploadBox, { backgroundColor: c.surface }]}>
                    <Text style={[styles.title, { color: c.text }]}>{selectedTitle}</Text>
                    <Button
                      title="이 곡에 악보 올리기"
                      loading={upload.isPending}
                      onPress={() => {
                        void upload.mutateAsync().then(
                          () => Alert.alert('완료', '악보를 올렸어요.'),
                          (e: Error) => Alert.alert('오류', e.message)
                        );
                      }}
                      containerStyle={{ marginTop: 10 }}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
            <Text style={[styles.section, { color: c.text }]}>악보 보유 곡</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="book-open"
              title="아직 악보가 없어요"
              description={
                canUpload
                  ? '위에서 곡을 찾아 악보 이미지를 올려 주세요.'
                  : '리더가 악보를 올리면 여기에 표시됩니다.'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelectedSongId(item.song_id);
              setSelectedTitle(item.title);
              setViewerOpen(true);
            }}
            style={[styles.row, { borderColor: c.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
              {item.artist ? (
                <Text style={[styles.sub, { color: c.textSub }]}>{item.artist}</Text>
              ) : null}
            </View>
            <Text style={[styles.badge, { color: c.accent }]}>{item.sheet_count}장</Text>
          </Pressable>
        )}
      />

      <SongSheetViewer
        visible={viewerOpen && !!selectedSongId}
        sheets={sheets}
        title={selectedTitle}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hint: { ...typeface.sans, fontSize: fontSize.sm, lineHeight: 20 },
  section: { ...typeface.sansMedium, fontSize: fontSize.base, marginTop: 8 },
  search: {
    ...typeface.sans,
    fontSize: fontSize.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  title: { ...typeface.sansMedium, fontSize: fontSize.base },
  sub: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 2 },
  badge: { ...typeface.sansMedium, fontSize: fontSize.xs },
  uploadBox: { borderRadius: radius.lg, padding: spacing.lg },
});
