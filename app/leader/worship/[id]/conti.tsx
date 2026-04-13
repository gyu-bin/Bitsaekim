import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SetlistEditor } from '@/components/leader/SetlistEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, fonts } from '@/constants/fonts';
import { useSongsSearch } from '@/hooks/useSongs';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import type { SetlistItem } from '@/types';

export default function ContiEditorScreen() {
  const { id: worshipId } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: searchHits } = useSongsSearch(search);

  const { data: items, isLoading } = useQuery({
    queryKey: ['setlist', worshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setlist_items')
        .select('*, song:songs(*)')
        .eq('worship_id', worshipId!)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as SetlistItem[];
    },
    enabled: !!worshipId,
  });

  const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => a.order_index - b.order_index), [items]);

  const persistOrder = useCallback(
    async (ordered: SetlistItem[]) => {
      if (!worshipId) return;
      await Promise.all(
        ordered.map((row, i) =>
          supabase.from('setlist_items').update({ order_index: i }).eq('id', row.id)
        )
      );
      qc.invalidateQueries({ queryKey: ['setlist', worshipId] });
    },
    [qc, worshipId]
  );

  const onDragEnd = (ordered: SetlistItem[]) => {
    void persistOrder(ordered);
  };

  const onNoteChange = async (itemId: string, note: string) => {
    await supabase.from('setlist_items').update({ leader_note: note }).eq('id', itemId);
    qc.invalidateQueries({ queryKey: ['setlist', worshipId] });
  };

  const addSong = async (songId: string) => {
    if (!worshipId) return;
    const next = sorted.length;
    const { error } = await supabase.from('setlist_items').insert({
      worship_id: worshipId,
      song_id: songId,
      order_index: next,
      is_special: false,
    });
    if (error) {
      Alert.alert('오류', '곡을 추가하지 못했습니다.');
      return;
    }
    qc.invalidateQueries({ queryKey: ['setlist', worshipId] });
    setSearch('');
  };

  const addSpecial = async (label: string) => {
    if (!worshipId) return;
    const next = sorted.length;
    const { error } = await supabase.from('setlist_items').insert({
      worship_id: worshipId,
      order_index: next,
      is_special: true,
      custom_label: label,
    });
    if (error) {
      Alert.alert('오류', '항목을 추가하지 못했습니다.');
      return;
    }
    qc.invalidateQueries({ queryKey: ['setlist', worshipId] });
  };

  const header = (
    <View style={styles.header}>
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="찬양 검색"
        style={{ marginBottom: 8 }}
      />
      {search.trim().length > 0 && (
        <View style={styles.searchBox}>
          {(searchHits ?? []).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.hit, { borderColor: c.border }]}
              onPress={() => addSong(s.id)}
            >
              <Text style={{ color: c.text, fontFamily: fonts.sansMedium }}>{s.title}</Text>
              {!!s.artist && (
                <Text style={{ color: c.textSub, fontSize: fontSize.sm }}>{s.artist}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.specialRow}>
        <Button title="+ 기도" variant="outline" onPress={() => addSpecial('기도')} />
        <Button title="+ 전주" variant="outline" onPress={() => addSpecial('전주')} />
      </View>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SetlistEditor
        items={sorted}
        onDragEnd={onDragEnd}
        onNoteChange={(itemId, note) => void onNoteChange(itemId, note)}
        ListHeaderComponent={header}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: { gap: 6, marginBottom: 8 },
  hit: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  specialRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
