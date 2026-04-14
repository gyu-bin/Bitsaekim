import { Feather } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SetlistItem } from '@/types';

type Props = {
  items: SetlistItem[];
  onDragEnd: (ordered: SetlistItem[]) => void;
  onNoteChange: (itemId: string, note: string) => void;
  ListHeaderComponent?: ReactElement | null;
};

export function SetlistEditor({ items, onDragEnd, onNoteChange, ListHeaderComponent }: Props) {
  const c = useThemeColors();

  const renderItem = ({ item, drag, isActive }: RenderItemParams<SetlistItem>) => {
    const title = item.is_special
      ? item.custom_label ?? '특별'
      : item.song?.title ?? '곡';
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.row,
            {
              backgroundColor: isActive ? c.accentLight : c.card,
              borderColor: c.border,
            },
          ]}
        >
          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
              {title}
            </Text>
            <TextInput
              placeholder="인도자 메모"
              placeholderTextColor={c.textSub}
              defaultValue={item.leader_note ?? ''}
              onEndEditing={(e) => onNoteChange(item.id, e.nativeEvent.text)}
              style={[styles.note, { color: c.textMid, borderColor: c.border }]}
            />
          </View>
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={150}
            accessibilityLabel="순서 변경"
            accessibilityHint="길게 눌러 드래그"
          >
            <Feather name="menu" size={22} color={c.textSub} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={items}
      keyExtractor={(it) => it.id}
      onDragEnd={({ data }) => onDragEnd(data)}
      renderItem={renderItem}
      containerStyle={styles.list}
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  body: { flex: 1, gap: 6 },
  title: { ...typeface.sansMedium, fontSize: fontSize.md },
  note: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
