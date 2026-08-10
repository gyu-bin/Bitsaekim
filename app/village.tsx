import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthorAvatar } from '@/components/ui/AuthorAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useVillageMembers } from '@/hooks/useVillageMembers';
import { useUserStore } from '@/stores/userStore';

export default function VillageScreen() {
  const c = useThemeColors();
  const { horizontalGutter, insets, listBottomPadding } = useLayoutMetrics();
  const gatheringName = useUserStore((s) => s.gatheringName);
  const gatheringId = useUserStore((s) => s.gatheringId);
  const { data: members, isLoading, isError, refetch, isRefetching } = useVillageMembers();

  if (!gatheringId) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: horizontalGutter }}>
          <ScreenHeader
            title="우리 모임"
            rightAction={
              <IconButton icon="x" accessibilityLabel="닫기" onPress={() => router.back()} />
            }
          />
          <EmptyState
            icon="users"
            title="모임이 없어요"
            description="모임에 참여하면 멤버 활동을 볼 수 있어요."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: horizontalGutter }}>
        <ScreenHeader
          title="우리 모임"
          subtitle={gatheringName ?? '모임'}
          rightAction={
            <IconButton icon="x" accessibilityLabel="닫기" onPress={() => router.back()} />
          }
        />
      </View>

      {isLoading && !members ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : isError ? (
        <EmptyState
          icon="alert-circle"
          title="멤버를 불러오지 못했어요"
          description="SQL 마이그레이션 적용 후 다시 시도해 주세요."
        />
      ) : (
        <FlatList
          data={members ?? []}
          keyExtractor={(item) => item.device_id}
          contentContainerStyle={{
            paddingHorizontal: horizontalGutter,
            paddingBottom: listBottomPadding,
            gap: spacing.sm,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={c.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="users" title="멤버가 없어요" description="초대 코드로 멤버를 초대해 보세요." />
          }
          ListHeaderComponent={
            <Text style={[styles.caption, { color: c.textMid }]}>
              빛점수·활동일 기준입니다. 필사를 하면 점수가 쌓여요.
            </Text>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.row, { borderColor: c.border }]}>
              <Text style={[styles.rank, { color: c.textSub }]}>{index + 1}</Text>
              <AuthorAvatar name={item.name} uri={item.avatar_url} size={40} />
              <View style={styles.meta}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.sub, { color: c.textSub }]}>
                  활동일 {item.activity_days} · 빛점수 {item.points}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  caption: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rank: { ...typeface.mono, fontSize: fontSize.sm, width: 22, textAlign: 'center' },
  meta: { flex: 1, minWidth: 0 },
  name: { ...typeface.sansMedium, fontSize: fontSize.base },
  sub: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 2 },
});
