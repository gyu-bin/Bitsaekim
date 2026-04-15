import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GalleryFilter } from '@/components/gallery/FilterChips';
import { FilterChips } from '@/components/gallery/FilterChips';
import { PostCard } from '@/components/gallery/PostCard';
import { fontSize, typeface } from '@/constants/fonts';
import { useGallery } from '@/hooks/useGallery';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const c = useThemeColors();
  const { data: worships, refetch: refetchWorships, isRefetching: worshipRefetching } = useWorships();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<GalleryFilter>('all');

  useEffect(() => {
    if (filterParam === 'mine') setFilter('mine');
  }, [filterParam]);

  const worshipId = filter !== 'all' && filter !== 'mine' ? filter : undefined;
  const mine = filter === 'mine';

  const q = useGallery(worshipId, mine);
  const posts = useMemo(() => q.data?.pages.flat() ?? [], [q.data?.pages]);

  const [manualRefresh, setManualRefresh] = useState(false);
  const onRefresh = useCallback(async () => {
    setManualRefresh(true);
    try {
      await Promise.all([q.refetch(), refetchWorships()]);
    } finally {
      setManualRefresh(false);
    }
  }, [q, refetchWorships]);

  const listPadBottom = tabBarHeight + Math.max(insets.bottom, 12) + 8;
  const galleryRefreshing = manualRefresh || q.isRefetching || worshipRefetching;

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: c.text }]}>나눔</Text>
          <Text style={[styles.subtitle, { color: c.textSub }]}>
            필사·사진뿐 아니라 찬양 링크·가사·묵상도 나눌 수 있어요
          </Text>
          <Text style={[styles.pullHint, { color: c.textSub }]}>아래로 당겨 새 글과 예배 목록을 새로고침</Text>
        </View>
        <FilterChips worships={worships ?? []} active={filter} onChange={setFilter} />
      </View>
    ),
    [c.text, c.textSub, worships, filter]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
          q.isLoading ? (
            <ActivityIndicator color={c.accent} style={styles.loader} />
          ) : (
            <Text style={[styles.empty, { color: c.textSub }]}>아직 게시물이 없습니다</Text>
          )
        }
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 12 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <PostCard post={item} />
          </View>
        )}
      />
      <View style={[styles.fabWrap, { bottom: listPadBottom + 4 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.accent }]}
          onPress={() =>
            Alert.alert('나눔 올리기', '어떤 형태로 올릴까요?', [
              {
                text: '사진·필사 캡처',
                onPress: () => router.push('/(tabs)/gallery/compose'),
              },
              {
                text: '찬양·링크·가사·묵상',
                onPress: () => router.push('/(tabs)/gallery/share-chant'),
              },
              { text: '취소', style: 'cancel' },
            ])
          }
          accessibilityRole="button"
          accessibilityLabel="나눔 글 올리기"
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: { paddingBottom: 10 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  title: {
    ...typeface.serifBold,
    fontSize: fontSize['2xl'],
  },
  subtitle: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  pullHint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 8, lineHeight: 16 },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 2,
  },
  listContent: { paddingTop: 4 },
  cell: { flex: 1, maxWidth: '50%', paddingHorizontal: 4 },
  loader: { marginTop: 16, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 12, ...typeface.sans, fontSize: fontSize.sm },
  fabWrap: {
    position: 'absolute',
    right: 16,
    left: undefined,
    alignItems: 'flex-end',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
