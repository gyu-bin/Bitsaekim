import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** 피드 썸네일 고정 비율 (가로:세로 = 1:1) — 카드마다 이미지 높이 동일 */
export const GALLERY_THUMB_ASPECT = 1;
export const GALLERY_THUMB_FALLBACK_ASPECT = GALLERY_THUMB_ASPECT;

type Props = {
  uri: string;
  postId: string;
  accentLight: string;
  /** FlatList 그리드 셀 너비(px). iPad 시뮬레이터에서 %/flex만 쓰면 0이 되어 이미지가 안 보임 */
  width?: number;
  onRecoverLoadFailure: () => void;
};

/**
 * 피드 썸네일 — 고정 1:1 박스 + cover (원본 비율과 무관하게 동일 크기)
 */
export const GalleryPostThumb = memo(function GalleryPostThumb({
  uri,
  postId,
  accentLight,
  width,
  onRecoverLoadFailure,
}: Props) {
  const boxHeight = width ? width : undefined;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: accentLight },
        width && boxHeight
          ? { width, height: boxHeight }
          : { width: '100%', aspectRatio: GALLERY_THUMB_ASPECT },
      ]}
    >
      <Image
        key={`${postId}-${uri}`}
        source={{ uri }}
        style={
          width && boxHeight
            ? { width, height: boxHeight }
            : StyleSheet.absoluteFillObject
        }
        resizeMode="cover"
        onError={onRecoverLoadFailure}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
