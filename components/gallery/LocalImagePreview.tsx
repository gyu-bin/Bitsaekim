import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { radius } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';

type Props = {
  uri: string | null;
  placeholder?: string;
  placeholderTextColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  /** 화면 높이 대비 미리보기 최대 비율 */
  maxHeightRatio?: number;
  minHeight?: number;
};

/** 로컬·원격 URI를 가로 꽉, 원본 비율에 맞는 높이로 미리보기 */
export function LocalImagePreview({
  uri,
  placeholder = '아직 선택한 사진이 없어요',
  placeholderTextColor = '#9a8c78',
  borderColor = '#e8e0d4',
  backgroundColor = '#ffffff',
  maxHeightRatio = 0.58,
  minHeight = 200,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [aspectRatio, setAspectRatio] = useState(3 / 4);

  useEffect(() => {
    if (!uri) setAspectRatio(3 / 4);
  }, [uri]);

  const contentWidth = Math.min(screenW - 40, 720);
  const maxHeight = screenH * maxHeightRatio;
  const naturalHeight = contentWidth / aspectRatio;
  const previewHeight = uri ? Math.max(minHeight, Math.min(naturalHeight, maxHeight)) : minHeight;

  if (!uri) {
    return (
      <View
        style={[
          styles.box,
          {
            borderColor,
            backgroundColor,
            minHeight,
            width: '100%',
          },
        ]}
      >
        <Text style={[styles.placeholder, { color: placeholderTextColor }]}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.box,
        {
          borderColor,
          backgroundColor,
          width: '100%',
          height: previewHeight,
        },
      ]}
    >
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        transition={150}
        onLoad={(e) => {
          const w = e.source.width;
          const h = e.source.height;
          if (w > 0 && h > 0) setAspectRatio(w / h);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    padding: 24,
    textAlign: 'center',
  },
});
