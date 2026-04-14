import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, typeface } from '@/constants/fonts';
import { useMyTranscriptions, type MyTranscriptionRow } from '@/hooks/useTranscription';
import { deleteTranscriptionForDevice } from '@/lib/transcriptionDelete';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/stores/userStore';

export default function MyTranscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const { data: rows, isLoading } = useMyTranscriptions();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const padBottom = tabBarHeight + Math.max(insets.bottom, 12) + 16;
  const deleteBarHeight =
    selectionMode && selectedIds.length > 0 ? 58 + Math.max(insets.bottom, 12) : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setSelectionMode((v) => {
              if (v) setSelectedIds([]);
              return !v;
            });
          }}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={selectionMode ? '선택 완료' : '선택'}
        >
          <Text style={[styles.headerBtnText, { color: c.accent }]}>
            {selectionMode ? '완료' : '선택'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, selectionMode, c.accent]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const confirmDeleteSelected = useCallback(() => {
    if (!deviceId || selectedIds.length === 0 || deleting) return;
    Alert.alert(
      '필사 기록 삭제',
      `선택한 ${selectedIds.length}개 기록을 삭제할까요? 나눔에 올린 사진은 삭제되지 않아요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                const results = await Promise.all(
                  selectedIds.map((id) =>
                    deleteTranscriptionForDevice({ transcriptionId: id, deviceId })
                  )
                );
                const failed = results.filter((r): r is { ok: false; message: string } => !r.ok);
                if (failed.length > 0) {
                  Alert.alert('오류', failed[0].message);
                }
                setSelectedIds([]);
                setSelectionMode(false);
                await qc.invalidateQueries({ queryKey: ['transcription-list'] });
                await qc.invalidateQueries({ queryKey: ['transcription-stats'] });
                await qc.invalidateQueries({ queryKey: ['transcription'] });
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  }, [deviceId, deleting, qc, selectedIds]);

  const renderItem = useCallback(
    ({ item }: { item: MyTranscriptionRow }) => {
      const d = new Date(item.completed_at);
      const dateLabel = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      const modeLabel = item.mode === 'handwriting' ? '손글씨' : '타이핑';
      const title = item.song?.title ?? '곡 정보 없음';
      const artist = item.song?.artist?.trim();
      const worshipName = item.worship?.name;
      const selected = selectedIds.includes(item.id);

      return (
        <TouchableOpacity
          style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => {
            if (selectionMode) toggleSelect(item.id);
            else
              router.push({
                pathname: '/(tabs)/mypage/transcription/[id]',
                params: { id: item.id },
              });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${title} 필사 기록`}
        >
          {selectionMode ? (
            <Feather
              name={selected ? 'check-square' : 'square'}
              size={22}
              color={c.accent}
              style={styles.checkbox}
            />
          ) : null}
          <View style={styles.rowMain}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
              {title}
            </Text>
            {artist ? (
              <Text style={[styles.artist, { color: c.textSub }]} numberOfLines={1}>
                {artist}
              </Text>
            ) : null}
            {worshipName ? (
              <Text style={[styles.worship, { color: c.textSub }]} numberOfLines={1}>
                {worshipName}
              </Text>
            ) : null}
          </View>
          <View style={styles.rowMeta}>
            <Text style={[styles.mode, { color: c.accent }]}>{modeLabel}</Text>
            <Text style={[styles.date, { color: c.textSub }]}>{dateLabel}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [c.accent, c.border, c.card, c.text, c.textSub, selectionMode, selectedIds, toggleSelect]
  );

  const listHeader = useMemo(
    () => (
      <Text style={[styles.lead, { color: c.textSub }]}>
        같은 예배·같은 곡은 한 번만 기록돼요. 곡을 누르면 나눔에 올린 필사가 있는지 보고, 바로 나눔으로 이어갈 수 있어요.
        {selectionMode ? '\n\n선택한 항목만 필사 완료 기록에서 지워요. 나눔 사진은 별도로 삭제해야 해요.' : ''}
      </Text>
    ),
    [c.textSub, selectionMode]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {isLoading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: padBottom + deleteBarHeight + 8 },
          ]}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textSub }]}>아직 완료한 필사가 없어요</Text>
          }
        />
      )}

      {selectionMode && selectedIds.length > 0 ? (
        <View
          style={[
            styles.deleteBar,
            {
              bottom: tabBarHeight,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: c.card,
              borderTopColor: c.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.deleteBarBtn, { backgroundColor: c.accent, opacity: deleting ? 0.65 : 1 }]}
            onPress={() => confirmDeleteSelected()}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel={`선택 ${selectedIds.length}개 삭제`}
          >
            <Feather name="trash-2" size={18} color="#fff" />
            <Text style={styles.deleteBarBtnText}>
              선택 삭제 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { ...typeface.sansMedium, fontSize: fontSize.md },
  lead: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  checkbox: { marginTop: 2 },
  rowMain: { flex: 1, minWidth: 0 },
  title: { ...typeface.sansMedium, fontSize: fontSize.md, lineHeight: 22 },
  artist: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4 },
  worship: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4 },
  rowMeta: { alignItems: 'flex-end' },
  mode: { ...typeface.sansMedium, fontSize: fontSize.xs },
  date: { ...typeface.mono, fontSize: fontSize.xs, marginTop: 4 },
  empty: { ...typeface.sans, fontSize: fontSize.sm, textAlign: 'center', marginTop: 32 },
  deleteBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  deleteBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteBarBtnText: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
    color: '#fff',
  },
});
