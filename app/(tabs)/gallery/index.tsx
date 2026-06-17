import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { GalleryCreateSheet } from '@/components/gallery/GalleryCreateSheet';
import type { GalleryFilter } from '@/components/gallery/FilterChips';
import { FilterChips } from '@/components/gallery/FilterChips';
import { PostCard } from '@/components/gallery/PostCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { shadow, spacing } from '@/constants/colors';
import { useGallery } from '@/hooks/useGallery';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { gallerySinceDate, isWorshipGalleryFilter } from '@/lib/galleryFilter';
import { isSupabaseConfigured, supabaseMissingConfigUserMessage } from '@/lib/supabase';

export default function GalleryScreen() {
  const { contentWidth, horizontalGutter, isWide, listBottomPadding, insets } = useLayoutMetrics();
  const c = useThemeColors();
  const numColumns = isWide ? 3 : 2;
  const gridGap = spacing.md;
  const cellWidth = useMemo(() => {
    const gaps = gridGap * (numColumns - 1);
    return Math.floor((contentWidth - gaps) / numColumns);
  }, [contentWidth, gridGap, numColumns]);
  const { data: worships, refetch: refetchWorships } = useWorships();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<GalleryFilter>('all');

  useEffect(() => {
    if (filterParam === 'mine') setFilter('mine');
  }, [filterParam]);

  const worshipId = isWorshipGalleryFilter(filter) ? filter : undefined;
  const mine = filter === 'mine';
  const since = gallerySinceDate(filter);

  const q = useGallery(worshipId, mine, since);
  const posts = useMemo(() => q.data?.pages.flat() ?? [], [q.data?.pages]);

  const [manualRefresh, setManualRefresh] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const onRefresh = useCallback(async () => {
    setManualRefresh(true);
    try {
      await Promise.all([q.refetch(), refetchWorships()]);
    } finally {
      setManualRefresh(false);
    }
  }, [q.refetch, refetchWorships]);

  const listPadBottom = listBottomPadding;
  const galleryRefreshing = manualRefresh;
  const showInitialLoader = isSupabaseConfigured() && q.isLoading && posts.length === 0;

  const listHeader = useMemo(
    () => (
      <View style={[styles.listHeader, { paddingHorizontal: horizontalGutter }]}>
        <ScreenHeader
          title="나눔"
          subtitle="필사·사진, 찬양과 묵상을 함께 나눠요"
        />
        <FilterChips
          worships={worships ?? []}
          active={filter}
          onChange={setFilter}
          horizontalPadding={horizontalGutter}
        />
      </View>
    ),
    [worships, filter, horizontalGutter]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <FlatList
        key={`gallery-cols-${numColumns}`}
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={
          numColumns > 1
            ? {
                paddingHorizontal: horizontalGutter,
                gap: gridGap,
                marginBottom: gridGap,
              }
            : undefined
        }
        removeClippedSubviews={false}
        windowSize={9}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: listPadBottom }]}
        refreshControl={
          <RefreshControl
            refreshing={galleryRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
        onEndReached={() => q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !isSupabaseConfigured() ? (
            <EmptyState
              icon="alert-circle"
              title="서버 연결 설정이 필요해요"
              description={supabaseMissingConfigUserMessage()}
            />
          ) : showInitialLoader ? (
            <ActivityIndicator color={c.accent} style={styles.loader} />
          ) : q.isError ? (
            <EmptyState
              icon="alert-circle"
              title="목록을 불러오지 못했어요"
              description="아래로 당겨 다시 시도해 주세요."
            />
          ) : (
            <EmptyState
              icon="image"
              title="아직 게시물이 없어요"
              description="오른쪽 아래 + 버튼으로 필사 캡처나 찬양·묵상을 나눠 보세요."
            />
          )
        }
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 12 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ width: cellWidth, marginBottom: gridGap }}>
            <PostCard post={item} thumbWidth={cellWidth} />
          </View>
        )}
      />
      <View style={[styles.fabWrap, { bottom: listPadBottom + 4, right: horizontalGutter }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, shadow.accent, { backgroundColor: c.accent }]}
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="나눔 글 올리기"
        >
          <Feather name="plus" size={26} color={c.onAccent} />
        </TouchableOpacity>
      </View>
      <GalleryCreateSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: { paddingBottom: 4 },
  listContent: { paddingTop: 4 },
  loader: { marginTop: 16, marginBottom: 8 },
  fabWrap: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
