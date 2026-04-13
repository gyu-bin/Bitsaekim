import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GalleryFilter } from '@/components/gallery/FilterChips';
import { FilterChips } from '@/components/gallery/FilterChips';
import { PostCard } from '@/components/gallery/PostCard';
import { fontSize, fonts } from '@/constants/fonts';
import { useGallery } from '@/hooks/useGallery';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorships } from '@/hooks/useWorships';

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const c = useThemeColors();
  const { data: worships } = useWorships();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<GalleryFilter>('all');

  useEffect(() => {
    if (filterParam === 'mine') setFilter('mine');
  }, [filterParam]);

  const worshipId = filter !== 'all' && filter !== 'mine' ? filter : undefined;
  const mine = filter === 'mine';

  const q = useGallery(worshipId, mine);
  const posts = useMemo(() => q.data?.pages.flat() ?? [], [q.data?.pages]);

  const listPadBottom = tabBarHeight + Math.max(insets.bottom, 12) + 8;

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: c.text }]}>나눔</Text>
          <Text style={[styles.subtitle, { color: c.textSub }]}>모두의 필사를 모아 보고 응원해 보세요</Text>
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
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: listPadBottom }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: { paddingBottom: 2 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 0,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: fontSize['2xl'],
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  row: { justifyContent: 'space-between', paddingHorizontal: 12 },
  /** flexGrow 제거: 빈 목록일 때 칩~빈 문구 사이가 과도하게 벌어지지 않음 */
  listContent: {},
  cell: { flex: 1, maxWidth: '50%' },
  loader: { marginTop: 16, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 12, fontFamily: fonts.sans, fontSize: fontSize.sm },
});
