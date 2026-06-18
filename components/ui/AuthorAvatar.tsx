import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  recyclingKey?: string;
};

export function AuthorAvatar({ name, uri, size = 28, recyclingKey }: Props) {
  const c = useThemeColors();
  const initial = (name?.[0] ?? '?').toUpperCase();
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: c.border,
          backgroundColor: c.accentMuted,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri ? (
        <Image
          recyclingKey={recyclingKey}
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={80}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: c.accent,
            },
          ]}
        >
          <Text style={[styles.initial, { color: c.onAccent, fontSize }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...typeface.sansMedium },
});
