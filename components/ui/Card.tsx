import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, shadow } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = ViewProps & {
  elevated?: boolean;
  padded?: boolean;
};

export function Card({ style, children, elevated = true, padded = true, ...rest }: Props) {
  const c = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        elevated && shadow.sm,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
