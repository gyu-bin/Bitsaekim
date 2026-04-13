import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';

export default function EditWorshipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['worship', id],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('worship_services')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return row as { name: string; description?: string };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? '');
    }
  }, [data]);

  const save = async () => {
    if (!id || !name.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('worship_services')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', id);
      if (error) throw error;
      router.back();
    } catch {
      Alert.alert('오류', '저장하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !data) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: c.textSub }]}>예배 이름</Text>
      <Input value={name} onChangeText={setName} />
      <Text style={[styles.label, { color: c.textSub }]}>설명</Text>
      <Input
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />
      <Button title="저장" onPress={save} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8 },
  label: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm, marginTop: 8 },
});
