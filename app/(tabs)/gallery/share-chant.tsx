import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/Button';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSongsSearch } from '@/hooks/useSongs';
import { useWorships } from '@/hooks/useWorships';
import { insertGallerySharePost } from '@/lib/galleryInsert';
import { pickAndUploadImage } from '@/lib/image';
import { useUserStore } from '@/stores/userStore';
import type { Song } from '@/types';

export default function GalleryShareChantScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const deviceId = useUserStore((s) => s.deviceId);
  const qc = useQueryClient();
  const { data: worships } = useWorships();

  const [postId] = useState(() => uuidv4());
  const [worshipId, setWorshipId] = useState<string | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const [songQuery, setSongQuery] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [lyricsShare, setLyricsShare] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const songsQ = useSongsSearch(songQuery);
  const songs = songsQ.data ?? [];

  const worshipLabel = useMemo(() => {
    if (!worshipId) return null;
    return worships?.find((w) => w.id === worshipId)?.name ?? null;
  }, [worshipId, worships]);

  const pickImage = async () => {
    if (!deviceId) {
      Alert.alert('안내', '기기 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진을 올리려면 사진 라이브러리 접근을 허용해 주세요.');
      return;
    }
    setPicking(true);
    try {
      const url = await pickAndUploadImage(deviceId, postId);
      if (!url) {
        Alert.alert('안내', '이미지를 가져오지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      setImageUrl(url);
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    if (!deviceId) {
      Alert.alert('안내', '기기 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await insertGallerySharePost({
        postId,
        deviceId,
        worshipId,
        songId,
        imagePublicUrl: imageUrl,
        body: body.trim() || null,
        link_url: linkUrl.trim() || null,
        lyrics_share: lyricsShare.trim() || null,
      });
      if (!result.ok) {
        Alert.alert('안내', result.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      Alert.alert('올렸어요', '나눔에 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
          ? e.message
          : '등록에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickSong = (s: Song) => {
    setSongId(s.id);
    setSongQuery(s.title);
  };

  const renderSongRow = (item: Song) => {
    const active = item.id === songId;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.songRow,
          {
            borderBottomColor: c.border,
            backgroundColor: active ? c.accentLight : c.card,
          },
        ]}
        onPress={() => onPickSong(item)}
      >
        <Text style={[styles.songTitle, { color: c.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.artist ? (
          <Text style={[styles.songArtist, { color: c.textSub }]} numberOfLines={1}>
            {item.artist}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.lead, { color: c.text }]}>
        은혜 받은 찬양 링크, 가사·필사 문구, 묵상을 함께 나눌 수 있어요. 사진(악보 촬영·캡처 등)은 선택입니다.
      </Text>

      <Text style={[styles.sectionLabel, { color: c.textSub }]}>예배 (선택)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <TouchableOpacity
          style={[
            styles.chip,
            { borderColor: c.border, backgroundColor: worshipId === null ? c.accentLight : c.card },
          ]}
          onPress={() => setWorshipId(null)}
        >
          <Text style={[styles.chipText, { color: c.text }]}>미선택</Text>
        </TouchableOpacity>
        {(worships ?? []).map((w) => {
          const on = worshipId === w.id;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.chip, { borderColor: c.border, backgroundColor: on ? c.accentLight : c.card }]}
              onPress={() => setWorshipId(w.id)}
            >
              <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                {w.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {worshipLabel ? (
        <Text style={[styles.hint, { color: c.textSub }]}>선택: {worshipLabel}</Text>
      ) : null}

      <Text style={[styles.sectionLabel, { color: c.textSub, marginTop: 16 }]}>곡 (선택)</Text>
      <TextInput
        value={songQuery}
        onChangeText={(t) => {
          setSongQuery(t);
          setSongId(null);
        }}
        placeholder="곡명·아티스트 검색"
        placeholderTextColor={c.textSub}
        style={[styles.textField, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
      />
      {songId ? (
        <TouchableOpacity onPress={() => setSongId(null)} style={styles.clearSong}>
          <Text style={[styles.clearSongText, { color: c.accent }]}>곡 선택 해제</Text>
        </TouchableOpacity>
      ) : null}
      <View style={[styles.songListWrap, { borderColor: c.border, backgroundColor: c.card }]}>
        {songsQ.isLoading ? (
          <Text style={[styles.listHint, { color: c.textSub }]}>불러오는 중…</Text>
        ) : songs.length === 0 ? (
          <Text style={[styles.listHint, { color: c.textSub }]}>검색 결과가 없습니다</Text>
        ) : (
          songs.map((s) => renderSongRow(s))
        )}
      </View>

      <Text style={[styles.sectionLabel, { color: c.textSub, marginTop: 16 }]}>링크 (선택)</Text>
      <TextInput
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="YouTube, 악보 사이트 등 URL"
        placeholderTextColor={c.textSub}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={[styles.textField, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
      />

      <Text style={[styles.sectionLabel, { color: c.textSub, marginTop: 16 }]}>가사·필사 나눔 (선택)</Text>
      <TextInput
        value={lyricsShare}
        onChangeText={setLyricsShare}
        placeholder="은혜 받은 구절·가사, 짧은 필사를 적어 보세요."
        placeholderTextColor={c.textSub}
        multiline
        textAlignVertical="top"
        style={[styles.lyricsInput, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
      />

      <Text style={[styles.sectionLabel, { color: c.textSub, marginTop: 16 }]}>묵상 (선택)</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="느낀 점을 나눠 보세요."
        placeholderTextColor={c.textSub}
        multiline
        textAlignVertical="top"
        style={[styles.bodyInput, { borderColor: c.border, color: c.text, backgroundColor: c.card }]}
      />

      <Text style={[styles.sectionLabel, { color: c.textSub, marginTop: 16 }]}>사진 (선택)</Text>
      <View style={[styles.previewBox, { borderColor: c.border, backgroundColor: c.card }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.preview} contentFit="contain" />
        ) : (
          <Text style={[styles.previewPlaceholder, { color: c.textSub }]}>악보·캡처를 넣을 수 있어요</Text>
        )}
      </View>
      <Button
        title={imageUrl ? '다른 사진으로 바꾸기' : '사진·앨범에서 가져오기'}
        variant="outline"
        onPress={() => void pickImage()}
        loading={picking}
        disabled={picking || submitting}
        containerStyle={styles.btn}
      />

      <Button
        title="나눔에 올리기"
        onPress={() => void submit()}
        loading={submitting}
        disabled={submitting || picking}
        containerStyle={styles.btn}
      />
      <Text style={[styles.footerNote, { color: c.textSub }]}>
        사진·링크·가사·묵상 중 하나 이상 입력해야 올릴 수 있어요.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lead: {
    ...typeface.sans,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: 8,
  },
  sectionLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    marginBottom: 8,
  },
  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: { ...typeface.sans, fontSize: fontSize.sm, maxWidth: 160 },
  hint: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 4 },
  textField: {
    ...typeface.sans,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearSong: { marginTop: 6 },
  clearSongText: { ...typeface.sans, fontSize: fontSize.xs },
  songListWrap: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  songRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  songTitle: { ...typeface.sansMedium, fontSize: fontSize.sm },
  songArtist: { ...typeface.sans, fontSize: fontSize.xs, marginTop: 2 },
  listHint: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    padding: 16,
    textAlign: 'center',
  },
  lyricsInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bodyInput: {
    ...typeface.sans,
    fontSize: fontSize.md,
    minHeight: 88,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewBox: {
    minHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', minHeight: 180 },
  previewPlaceholder: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    padding: 20,
    textAlign: 'center',
  },
  btn: { marginTop: 12 },
  footerNote: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    marginTop: 12,
    lineHeight: 18,
  },
});
