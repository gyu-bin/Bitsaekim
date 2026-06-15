import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LikeButton } from '@/components/gallery/LikeButton';
import {
  GalleryPostThumb,
  GALLERY_THUMB_ASPECT,
} from '@/components/gallery/GalleryPostThumb';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { deleteGalleryPost } from '@/lib/galleryDelete';
import { updateGalleryPost } from '@/lib/galleryInsert';
import { refreshGalleryCache } from '@/lib/galleryQuery';
import {
  normalizeImageUri,
  resolveGalleryImageUrlForDisplay,
} from '@/lib/galleryImageUrl';
import { useUserStore } from '@/stores/userStore';
import type { GalleryPost } from '@/types';

export type PostCardProps = { post: GalleryPost; thumbWidth?: number };

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function withHttpScheme(raw: string) {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** 로드 전·텍스트 전용 슬롯 — 썸네일과 동일한 1:1 */
const THUMB_FALLBACK_ASPECT = GALLERY_THUMB_ASPECT;

function PostCardInner({ post, thumbWidth }: PostCardProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const myDisplayName = useUserStore((s) => s.name);
  const { width: winW } = useWindowDimensions();
  const detailImageMaxH = Math.round(winW * 0.85);
  const canEditMyPost = Boolean(deviceId && post.device_id === deviceId);
  const fallbackUri = useMemo(
    () => resolveGalleryImageUrlForDisplay(post.image_url) ?? normalizeImageUri(post.image_url),
    [post.image_url]
  );
  const rawImageUrl = post.image_url?.trim() ?? '';
  const hasImageUrl = rawImageUrl.length > 0;
  const [imgFailed, setImgFailed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  /** 공개 URL 우선 — 버킷이 public이라 실기기·시뮬레이터 모두 동일하게 동작 */
  const [displayUri, setDisplayUri] = useState<string | null>(fallbackUri);
  const [deleting, setDeleting] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editLink, setEditLink] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [editBody, setEditBody] = useState('');

  useEffect(() => {
    setImgFailed(false);
    setDisplayUri(fallbackUri);
  }, [post.id, post.image_url, fallbackUri]);

  useEffect(() => {
    if (!detailOpen) {
      setDetailMenuOpen(false);
      setEditing(false);
      return;
    }
    setEditLink(post.link_url?.trim() ?? '');
    setEditLyrics(post.lyrics_share?.trim() ?? '');
    setEditBody(post.body?.trim() ?? '');
  }, [detailOpen, post.id, post.link_url, post.lyrics_share, post.body]);

  const onImageError = useCallback(() => {
    setImgFailed(true);
  }, []);

  const linkTrim = post.link_url?.trim() ?? '';
  const hasLink = linkTrim.length > 0;
  const lyricsTrim = post.lyrics_share?.trim() ?? '';
  const hasLyrics = lyricsTrim.length > 0;
  /** 사진 없는 글(가사·묵상만)에만 이모지 */
  const textOnlyPlaceholder = hasLink || hasLyrics ? '🎵' : '✍️';

  const openLink = () => {
    if (!hasLink) return;
    void Linking.openURL(withHttpScheme(linkTrim)).catch(() => {});
  };

  const authorName = useMemo(() => {
    const fromPost = post.user?.name?.trim();
    if (deviceId && post.device_id === deviceId) {
      const mine = myDisplayName?.trim();
      return mine || fromPost || '이름 없음';
    }
    return fromPost || '이름 없음';
  }, [deviceId, post.device_id, post.user?.name, myDisplayName]);
  const authorLine = `작성 · ${authorName}`;
  const openDetail = useCallback(() => {
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailMenuOpen(false);
    setEditing(false);
    setDetailOpen(false);
  }, []);

  const startEdit = useCallback(() => {
    setDetailMenuOpen(false);
    setEditLink(post.link_url?.trim() ?? '');
    setEditLyrics(post.lyrics_share?.trim() ?? '');
    setEditBody(post.body?.trim() ?? '');
    setEditing(true);
  }, [post.body, post.link_url, post.lyrics_share]);

  const saveEdit = useCallback(() => {
    if (!deviceId || saving) return;
    setSaving(true);
    void (async () => {
      try {
        const res = await updateGalleryPost({
          postId: post.id,
          deviceId,
          body: editBody,
          link_url: editLink,
          lyrics_share: editLyrics,
        });
        if (!res.ok) {
          Alert.alert('오류', res.message);
          return;
        }
        setEditing(false);
        await refreshGalleryCache(qc);
      } finally {
        setSaving(false);
      }
    })();
  }, [deviceId, saving, post.id, editBody, editLink, editLyrics, qc]);

  const confirmDeletePost = useCallback(() => {
    if (!deviceId || deleting) return;
    setDetailMenuOpen(false);
    Alert.alert('나눔 삭제', '이 글을 삭제할까요? 삭제하면 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            try {
              const res = await deleteGalleryPost({
                postId: post.id,
                deviceId,
                imageUrl: post.image_url,
              });
              if (!res.ok) {
                Alert.alert('오류', res.message);
                return;
              }
              setDetailOpen(false);
              await refreshGalleryCache(qc);
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  }, [deleting, deviceId, post.id, post.image_url, qc]);

  const sharePreviewImage = useCallback(async () => {
    setDetailMenuOpen(false);
    if (!displayUri) return;
    try {
      await Share.share({
        message: displayUri,
        url: displayUri,
      });
    } catch {
      /* 사용자가 시트를 닫은 경우 등 */
    }
  }, [displayUri]);

  const thumbBoxStyle = thumbWidth
    ? { width: thumbWidth, height: thumbWidth }
    : { width: '100%' as const, aspectRatio: THUMB_FALLBACK_ASPECT };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        onPress={openDetail}
        style={({ pressed }) => [
          styles.cardPressable,
          pressed ? styles.cardPressablePressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="나눔 상세 보기"
      >
        {!hasImageUrl ? (
          <View
            style={[
              styles.thumbWrap,
              thumbBoxStyle,
              {
                backgroundColor: c.accentLight,
                alignItems: 'center',
              },
            ]}
          >
            <Text style={styles.placeholderEmoji}>{textOnlyPlaceholder}</Text>
          </View>
        ) : imgFailed || !displayUri ? (
          <View
            style={[
              styles.thumbWrap,
              thumbBoxStyle,
              {
                backgroundColor: c.accentLight,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              },
            ]}
          >
            <Feather name="image" size={28} color={c.textSub} />
            <Text style={[styles.thumbFailText, { color: c.textSub }]}>사진 불러오기 실패</Text>
          </View>
        ) : (
          <GalleryPostThumb
            uri={displayUri}
            postId={post.id}
            accentLight={c.accentLight}
            width={thumbWidth}
            onRecoverLoadFailure={onImageError}
          />
        )}

        <View style={styles.bodyWrap}>
          <Text style={[styles.author, { color: c.textSub }]} numberOfLines={1}>
            {authorLine}
          </Text>
          <Text style={[styles.song, { color: c.text }]} numberOfLines={1}>
            {post.song?.title ?? (hasLyrics || hasLink ? '찬양 나눔' : '곡')}
          </Text>
          <Text style={[styles.worship, { color: c.textSub }]} numberOfLines={1}>
            {post.worship?.name ?? '예배'}
          </Text>
          {hasLink ? (
            <Pressable onPress={openLink} style={styles.linkPress}>
              <Text style={[styles.linkText, { color: c.accent }]} numberOfLines={2}>
                {linkTrim}
              </Text>
            </Pressable>
          ) : null}
          {hasLyrics ? (
            <Text style={[styles.lyricsText, { color: c.textMid }]} numberOfLines={6}>
              {lyricsTrim}
            </Text>
          ) : null}
          {post.body?.trim() ? (
            <Text style={[styles.bodyText, { color: c.textMid }]} numberOfLines={4}>
              {post.body.trim()}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Modal
        visible={detailOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetail}
      >
        <View style={[styles.detailRoot, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.detailTopBar, { borderBottomColor: c.border }]}>
            <Text style={[styles.detailTitle, { color: c.text }]}>나눔 상세</Text>
            <View style={styles.modalTopBarRight}>
              <TouchableOpacity
                style={[styles.detailIconBtn, { backgroundColor: c.accentLight }]}
                onPress={() => setDetailMenuOpen((v) => !v)}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="더보기"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="more-horizontal" size={22} color={c.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailIconBtn, { backgroundColor: c.accentLight }]}
                onPress={closeDetail}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={24} color={c.text} />
              </TouchableOpacity>
            </View>
          </View>

          {detailMenuOpen ? (
            <Pressable
              style={styles.detailMenuBackdrop}
              onPress={() => setDetailMenuOpen(false)}
              accessibilityLabel="메뉴 닫기"
            />
          ) : null}

          {detailMenuOpen ? (
            <View
              style={[
                styles.detailMenu,
                {
                  top: insets.top + 52,
                  backgroundColor: c.card,
                  borderColor: c.border,
                },
              ]}
            >
              {displayUri && !imgFailed ? (
                <Pressable
                  style={[styles.previewMenuRow, { borderBottomColor: c.border }]}
                  onPress={() => void sharePreviewImage()}
                  accessibilityRole="button"
                  accessibilityLabel="공유"
                >
                  <Feather name="share-2" size={18} color={c.text} />
                  <Text style={[styles.detailMenuLabel, { color: c.text }]}>공유</Text>
                </Pressable>
              ) : null}
              {canEditMyPost ? (
                <Pressable
                  style={[styles.previewMenuRow, { borderBottomColor: c.border }]}
                  onPress={startEdit}
                  accessibilityRole="button"
                  accessibilityLabel="수정"
                >
                  <Feather name="edit-3" size={18} color={c.text} />
                  <Text style={[styles.detailMenuLabel, { color: c.text }]}>수정</Text>
                </Pressable>
              ) : null}
              {canEditMyPost ? (
                <Pressable
                  style={[styles.previewMenuRow, { borderBottomColor: c.border }]}
                  onPress={() => confirmDeletePost()}
                  disabled={deleting}
                  accessibilityRole="button"
                  accessibilityLabel="삭제"
                >
                  <Feather name="trash-2" size={18} color="#c44" />
                  <Text style={[styles.detailMenuLabel, styles.previewMenuLabelDanger]}>삭제</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.previewMenuRow, styles.previewMenuRowLast]}
                onPress={() => setDetailMenuOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={[styles.detailMenuLabel, { color: c.textSub }]}>취소</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={[
              styles.detailScroll,
              { paddingBottom: Math.max(insets.bottom, 20) + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {hasImageUrl && displayUri && !imgFailed ? (
              <View style={[styles.detailImageWrap, { backgroundColor: c.accentLight }]}>
                <Image
                  recyclingKey={`${post.id}-detail`}
                  source={{ uri: displayUri }}
                  style={{ width: winW, height: detailImageMaxH }}
                  contentFit="contain"
                  transition={120}
                  cachePolicy="memory-disk"
                />
              </View>
            ) : !hasImageUrl ? (
              <View style={[styles.detailTextOnlyHero, { backgroundColor: c.accentLight }]}>
                <Text style={styles.detailTextOnlyEmoji}>{textOnlyPlaceholder}</Text>
              </View>
            ) : null}

            <View style={styles.detailBody}>
              <Text style={[styles.detailAuthor, { color: c.textSub }]}>{authorLine}</Text>
              <Text style={[styles.detailSong, { color: c.text }]}>
                {post.song?.title ?? (hasLyrics || hasLink ? '찬양 나눔' : '곡')}
              </Text>
              <Text style={[styles.detailWorship, { color: c.textSub }]}>
                {post.worship?.name ?? '예배'}
              </Text>

              {hasLink && !editing ? (
                <Pressable onPress={openLink} style={styles.detailLinkPress}>
                  <Feather name="link" size={14} color={c.accent} />
                  <Text style={[styles.detailLinkText, { color: c.accent }]}>{linkTrim}</Text>
                </Pressable>
              ) : null}

              {editing ? (
                <View style={styles.detailEditForm}>
                  <Text style={[styles.detailBlockLabel, { color: c.textSub }]}>링크</Text>
                  <TextInput
                    value={editLink}
                    onChangeText={setEditLink}
                    placeholder="https://..."
                    placeholderTextColor={c.textSub}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={[
                      styles.detailInput,
                      { color: c.text, borderColor: c.border, backgroundColor: c.card },
                    ]}
                  />
                  <Text style={[styles.detailBlockLabel, { color: c.textSub }]}>가사</Text>
                  <TextInput
                    value={editLyrics}
                    onChangeText={setEditLyrics}
                    placeholder="나누고 싶은 가사"
                    placeholderTextColor={c.textSub}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.detailInput,
                      styles.detailInputMultiline,
                      { color: c.text, borderColor: c.border, backgroundColor: c.card },
                    ]}
                  />
                  <Text style={[styles.detailBlockLabel, { color: c.textSub }]}>묵상</Text>
                  <TextInput
                    value={editBody}
                    onChangeText={setEditBody}
                    placeholder="묵상·느낀 점"
                    placeholderTextColor={c.textSub}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.detailInput,
                      styles.detailInputMultiline,
                      { color: c.text, borderColor: c.border, backgroundColor: c.card },
                    ]}
                  />
                  <View style={styles.detailEditActions}>
                    <TouchableOpacity
                      style={[styles.detailEditBtn, { borderColor: c.border }]}
                      onPress={() => setEditing(false)}
                      disabled={saving}
                    >
                      <Text style={[styles.detailEditBtnText, { color: c.textSub }]}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailEditBtn, styles.detailEditBtnPrimary, { backgroundColor: c.accent }]}
                      onPress={saveEdit}
                      disabled={saving}
                    >
                      <Text style={[styles.detailEditBtnText, { color: c.onAccent }]}>
                        {saving ? '저장 중…' : '저장'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
              {hasLyrics ? (
                <View style={[styles.detailBlock, { backgroundColor: c.accentLight }]}>
                  <Text style={[styles.detailBlockLabel, { color: c.textSub }]}>가사</Text>
                  <Text style={[styles.detailLyrics, { color: c.textMid }]}>{lyricsTrim}</Text>
                </View>
              ) : null}

              {post.body?.trim() ? (
                <View style={styles.detailBlock}>
                  <Text style={[styles.detailBlockLabel, { color: c.textSub }]}>묵상</Text>
                  <Text style={[styles.detailBodyText, { color: c.textMid }]}>{post.body.trim()}</Text>
                </View>
              ) : null}
                </>
              )}

              <View style={[styles.detailFooter, { borderTopColor: c.border }]}>
                <LikeButton
                  postId={post.id}
                  initialCount={post.likes_count ?? 0}
                  initialLiked={post.is_liked ?? false}
                />
                <Text style={[styles.date, { color: c.textSub }]}>
                  {formatCreatedAt(post.created_at)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={styles.footer}>
        <LikeButton
          postId={post.id}
          initialCount={post.likes_count ?? 0}
          initialLiked={post.is_liked ?? false}
        />
        <Text style={[styles.date, { color: c.textSub }]}>{formatCreatedAt(post.created_at)}</Text>
      </View>
    </View>
  );
}

function postCardPropsEqual(prev: PostCardProps, next: PostCardProps) {
  if (prev.thumbWidth !== next.thumbWidth) return false;
  const a = prev.post;
  const b = next.post;
  return (
    a.id === b.id &&
    a.image_url === b.image_url &&
    a.body === b.body &&
    a.lyrics_share === b.lyrics_share &&
    a.link_url === b.link_url &&
    a.likes_count === b.likes_count &&
    a.is_liked === b.is_liked &&
    a.user?.name === b.user?.name &&
    a.device_id === b.device_id &&
    a.song?.title === b.song?.title &&
    a.worship?.name === b.worship?.name
  );
}

export const PostCard = memo(PostCardInner, postCardPropsEqual);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  cardPressable: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    overflow: 'hidden',
  },
  cardPressablePressed: {
    opacity: 0.94,
  },
  thumbWrap: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 40 },
  thumbFailText: { ...typeface.sans, fontSize: fontSize.xs, textAlign: 'center' },
  bodyWrap: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 6 },
  author: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  song: { ...typeface.serif, fontSize: fontSize.sm },
  worship: { ...typeface.sans, fontSize: fontSize.xs },
  linkPress: { marginTop: 4 },
  linkText: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    textDecorationLine: 'underline',
  },
  lyricsText: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  bodyText: {
    ...typeface.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginTop: 2,
  },
  date: { ...typeface.mono, fontSize: fontSize.xs },
  detailRoot: { flex: 1 },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailTitle: {
    ...typeface.serif,
    fontSize: fontSize.lg,
  },
  detailIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 25,
  },
  detailMenu: {
    position: 'absolute',
    right: 16,
    minWidth: 188,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  detailMenuLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
  detailScroll: {
    flexGrow: 1,
  },
  detailImageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextOnlyHero: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextOnlyEmoji: { fontSize: 56 },
  detailBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  detailAuthor: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
  },
  detailSong: {
    ...typeface.serif,
    fontSize: fontSize.xl,
    marginTop: 2,
  },
  detailWorship: {
    ...typeface.sans,
    fontSize: fontSize.sm,
  },
  detailLinkPress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  detailLinkText: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
    flex: 1,
  },
  detailBlock: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailBlockLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
  },
  detailLyrics: {
    ...typeface.sans,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  detailBodyText: {
    ...typeface.sans,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailEditForm: { marginTop: 8, gap: 8 },
  detailInput: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailInputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  detailEditActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  detailEditBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailEditBtnPrimary: { borderWidth: 0 },
  detailEditBtnText: { ...typeface.sansMedium, fontSize: fontSize.sm },
  modalTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewMenuRowLast: {
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  previewMenuLabelDanger: {
    color: '#c44',
  },
});
