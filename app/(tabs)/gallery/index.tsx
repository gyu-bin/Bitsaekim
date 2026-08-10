import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/colors';
import { useGallery } from '@/hooks/useGallery';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';
import { galleryPostMatchesSince, gallerySinceDate, galleryTimeFilterKey, isWorshipGalleryFilter } from '@/lib/galleryFilter';
import { isSupabaseConfigured, supabaseMissingConfigUserMessage } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export default function GalleryScreen() {
  const { contentWidth, horizontalGutter, isWide, listBottomPadding, insets } = useLayoutMetrics();
  const c = useThemeColors();
  const numColumns = isWide ? 3 : 2;
  const gridGap = spacing.md;
  const cellWidth = useMemo(() => {
    const gaps = gridGap * (numColumns - 1);
    return Math.floor((contentWidth - gaps) / numColumns);
  }, [contentWidth, gridGap, numColumns]);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const { data: worships, refetch: refetchWorships } = useWorships();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<GalleryFilter>('all');

  useEffect(() => {
    if (!gatheringId) {
      setFilter('mine');
      return;
    }
    if (filterParam === 'mine') setFilter('mine');
  }, [filterParam, gatheringId]);

  const worshipId = isWorshipGalleryFilter(filter) ? filter : undefined;
  const mine = !gatheringId || filter === 'mine';
  const timeFilter = galleryTimeFilterKey(filter);
  const since = useMemo(() => gallerySinceDate(filter), [filter]);

  const q = useGallery(worshipId, mine, since, timeFilter);
  const posts = useMemo(() => {
    const flat = q.data?.pages.flat() ?? [];
    if (!since) return flat;
    return flat.filter((p) => galleryPostMatchesSince(p.created_at, since));
  }, [q.data?.pages, since]);

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
          subtitle={
            gatheringId
              ? '필사·사진, 찬양과 묵상을 함께 나눠요'
              : '내 필사 보관함 · 모임에 들어가면 함께 나눌 수 있어요'
          }
          showThemeToggle
        />
        {gatheringId ? (
          <FilterChips
            worships={worships ?? []}
            active={filter}
            onChange={setFilter}
            horizontalPadding={horizontalGutter}
          />
        ) : null}
      </View>
    ),
    [worships, filter, horizontalGutter, gatheringId]
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
            <LoadingSpinner />
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
          q.isFetchingNextPage ? <LoadingSpinner compact style={{ marginVertical: 12 }} /> : null
        }
        renderItem={({ item }) => (
          <View style={{ width: cellWidth, marginBottom: gridGap }}>
            <PostCard post={item} thumbWidth={cellWidth} />
          </View>
        )}
      />
      <View style={[styles.fabWrap, { bottom: listPadBottom + 4, right: horizontalGutter }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.text }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCreateOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="나눔 글 올리기"
        >
          <Feather name="plus" size={24} color={c.card} />
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
  fabWrap: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
