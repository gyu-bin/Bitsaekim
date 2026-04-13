import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeString(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}:00`;
}

export default function CreateWorshipScreen() {
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !deviceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('worship_services')
        .insert({
          name: name.trim(),
          service_date: toDateString(date),
          service_time: toTimeString(time),
          description: description.trim() || null,
          creator_id: deviceId,
        })
        .select()
        .single();
      if (error) throw error;
      router.replace(`/leader/worship/${data.id}/conti`);
    } catch {
      Alert.alert('오류', '예배를 만들지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: c.textSub }]}>예배 이름</Text>
      <Input value={name} onChangeText={setName} placeholder="주일 2부 예배" />

      <Text style={[styles.label, { color: c.textSub }]}>날짜</Text>
      <Button title={toDateString(date)} variant="outline" onPress={() => setShowDate(true)} />
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(ev, selected) => {
            if (Platform.OS === 'android') setShowDate(false);
            if (ev.type === 'set' && selected) setDate(selected);
          }}
        />
      )}

      <Text style={[styles.label, { color: c.textSub }]}>시간</Text>
      <Button title={toTimeString(time).slice(0, 5)} variant="outline" onPress={() => setShowTime(true)} />
      {showTime && (
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(ev, selected) => {
            if (Platform.OS === 'android') setShowTime(false);
            if (ev.type === 'set' && selected) setTime(selected);
          }}
        />
      )}

      <Text style={[styles.label, { color: c.textSub }]}>설명 (선택)</Text>
      <Input
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      <Button title="저장 후 콘티 편성" onPress={submit} loading={loading} disabled={!name.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontFamily: fonts.sansMedium, fontSize: fontSize.sm, marginTop: 8 },
});
