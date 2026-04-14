import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LikeButton } from '@/components/gallery/LikeButton';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { deleteGalleryPost } from '@/lib/galleryDelete';
import {
  getGallerySignedImageUrl,
  getPreferredGalleryDisplayUrl,
  resolveGalleryImageUrlForDisplay,
} from '@/lib/galleryImageUrl';
import { useUserStore } from '@/stores/userStore';
import type { GalleryPost } from '@/types';

type Props = { post: GalleryPost };

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function withHttpScheme(raw: string) {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function PostCard({ post }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const deviceId = useUserStore((s) => s.deviceId);
  const myDisplayName = useUserStore((s) => s.name);
  const { width: winW, height: winH } = useWindowDimensions();
  /** 크게보기: 상단 버튼줄·세이프영역·여백을 뺀 만큼 최대로 사용 */
  const previewModalImageSize = useMemo(() => {
    const topChrome = insets.top + 56;
    const sidePad = 12;
    const bottomGap = Math.max(insets.bottom, 12);
    const w = Math.max(120, winW - sidePad * 2);
    const h = Math.max(120, winH - topChrome - bottomGap - 4);
    return { width: w, height: h };
  }, [winW, winH, insets.top, insets.bottom]);
  const canDeleteMyPost = Boolean(deviceId && post.device_id === deviceId);
  const resolvedForPost = resolveGalleryImageUrlForDisplay(post.image_url);
  const hasImage = resolvedForPost != null;
  const [imgFailed, setImgFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [displayUri, setDisplayUri] = useState<string | null>(() =>
    resolveGalleryImageUrlForDisplay(post.image_url)
  );
  const [signedTried, setSignedTried] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    setSignedTried(false);
    const sync = resolveGalleryImageUrlForDisplay(post.image_url);
    setDisplayUri(sync);
    let cancelled = false;
    void (async () => {
      const preferred = await getPreferredGalleryDisplayUrl(post.image_url);
      if (cancelled) return;
      if (preferred) setDisplayUri(preferred);
    })();
    return () => {
      cancelled = true;
    };
  }, [post.id, post.image_url]);

  useEffect(() => {
    if (!previewOpen) setPreviewMenuOpen(false);
  }, [previewOpen]);

  const onImageError = useCallback(() => {
    const raw = post.image_url?.trim();
    if (!raw || signedTried) {
      setImgFailed(true);
      return;
    }
    setSignedTried(true);
    void (async () => {
      const signed = await getGallerySignedImageUrl(raw);
      if (signed) {
        setDisplayUri(signed);
      } else {
        setImgFailed(true);
      }
    })();
  }, [post.image_url, signedTried]);

  const linkTrim = post.link_url?.trim() ?? '';
  const hasLink = linkTrim.length > 0;
  const lyricsTrim = post.lyrics_share?.trim() ?? '';
  const hasLyrics = lyricsTrim.length > 0;
  const placeholder = !hasImage && (hasLink || hasLyrics) ? '🎵' : '✍️';

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
  /** 썸네일: 로드 실패 시 이모지·플레이스홀더 */
  const showThumbImage = hasImage && !imgFailed && !!displayUri;
  /**
   * 크게보기: 이미지 로드가 실패해도(image_url이 있으면) 탭은 먹히게 함.
   * 이전에는 imgFailed 시 Pressable이 disabled라 항목이 전혀 눌리지 않았음.
   */
  const hasImageUrl = Boolean(post.image_url?.trim());
  const canOpenImagePreview =
    hasImageUrl && (resolvedForPost != null || displayUri != null);

  const openImagePreview = useCallback(() => {
    if (canOpenImagePreview) setPreviewOpen(true);
  }, [canOpenImagePreview]);

  const confirmDeletePost = useCallback(() => {
    if (!deviceId || deleting) return;
    setPreviewMenuOpen(false);
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
              setPreviewOpen(false);
              await qc.invalidateQueries({ queryKey: ['gallery'] });
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  }, [deleting, deviceId, post.id, post.image_url, qc]);

  const sharePreviewImage = useCallback(async () => {
    setPreviewMenuOpen(false);
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

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        onPress={openImagePreview}
        disabled={!canOpenImagePreview}
        style={({ pressed }) => [
          styles.cardPressable,
          pressed && canOpenImagePreview ? styles.cardPressablePressed : null,
        ]}
        accessibilityRole={canOpenImagePreview ? 'button' : undefined}
        accessibilityLabel={canOpenImagePreview ? '사진 크게 보기' : undefined}
      >
        <View style={[styles.imgBox, { backgroundColor: c.accentLight }]}>
          {showThumbImage ? (
            <Image
              recyclingKey={post.id}
              key={displayUri ?? 'thumb'}
              source={{ uri: displayUri! }}
              style={styles.img}
              contentFit="cover"
              onError={onImageError}
            />
          ) : (
            <Text style={styles.placeholderEmoji}>{placeholder}</Text>
          )}
        </View>

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
        visible={previewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewMenuOpen(false);
          setPreviewOpen(false);
        }}
      >
        <View style={[styles.modalRoot, { backgroundColor: 'rgba(0,0,0,0.94)' }]}>
          <Pressable
            style={[styles.modalPress, { minHeight: winH, paddingTop: insets.top + 56 }]}
            onPress={() => {
              setPreviewMenuOpen(false);
              setPreviewOpen(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <View style={styles.modalImageWrap} pointerEvents="none">
              {displayUri ? (
                <Image
                  key={displayUri}
                  source={{ uri: displayUri }}
                  style={{
                    width: previewModalImageSize.width,
                    height: previewModalImageSize.height,
                  }}
                  contentFit="contain"
                />
              ) : (
                <Text style={[styles.modalFallback, { color: 'rgba(255,255,255,0.85)' }]}>
                  이미지를 불러올 수 없습니다.
                </Text>
              )}
            </View>
          </Pressable>

          {previewMenuOpen ? (
            <Pressable
              style={styles.modalMenuBackdrop}
              onPress={() => setPreviewMenuOpen(false)}
              accessibilityLabel="메뉴 닫기"
            />
          ) : null}

          <View style={[styles.modalTopBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <View style={styles.modalTopBarRight}>
              <TouchableOpacity
                style={[styles.modalIconBtn, deleting && styles.modalIconBtnDisabled]}
                onPress={() => setPreviewMenuOpen((v) => !v)}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="더보기"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="more-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalIconBtn}
                onPress={() => {
                  setPreviewMenuOpen(false);
                  setPreviewOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {previewMenuOpen ? (
            <View
              style={[
                styles.previewMenu,
                {
                  top: insets.top + 8 + 44 + 6,
                  backgroundColor: 'rgba(40,36,32,0.98)',
                  borderColor: 'rgba(255,255,255,0.12)',
                },
              ]}
            >
              <Pressable
                style={styles.previewMenuRow}
                onPress={() => void sharePreviewImage()}
                accessibilityRole="button"
                accessibilityLabel="공유"
              >
                <Feather name="share-2" size={18} color="#fff" />
                <Text style={styles.previewMenuLabel}>공유</Text>
              </Pressable>
              {canDeleteMyPost ? (
                <Pressable
                  style={styles.previewMenuRow}
                  onPress={() => confirmDeletePost()}
                  disabled={deleting}
                  accessibilityRole="button"
                  accessibilityLabel="삭제"
                >
                  <Feather name="trash-2" size={18} color="#ff8a8a" />
                  <Text style={[styles.previewMenuLabel, styles.previewMenuLabelDanger]}>삭제</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.previewMenuRow, styles.previewMenuRowLast]}
                onPress={() => setPreviewMenuOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={[styles.previewMenuLabel, styles.previewMenuCancelOnly]}>취소</Text>
              </Pressable>
            </View>
          ) : null}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    margin: 4,
  },
  cardPressable: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    overflow: 'hidden',
  },
  cardPressablePressed: {
    opacity: 0.94,
  },
  imgBox: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  placeholderEmoji: { fontSize: 40 },
  bodyWrap: { padding: 10, gap: 4 },
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
    marginTop: 6,
  },
  date: { ...typeface.mono, fontSize: fontSize.xs },
  modalRoot: {
    flex: 1,
  },
  modalMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 25,
  },
  modalTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 40,
  },
  modalTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  modalIconBtnDisabled: {
    opacity: 0.6,
  },
  modalPress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  previewMenu: {
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
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  previewMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  previewMenuRowLast: {
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  previewMenuLabel: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
    color: '#fff',
  },
  previewMenuLabelDanger: {
    color: '#ffb4b4',
  },
  previewMenuCancelOnly: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    flex: 1,
  },
  modalFallback: {
    ...typeface.sans,
    fontSize: fontSize.md,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
