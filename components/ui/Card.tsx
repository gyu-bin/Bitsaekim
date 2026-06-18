import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = ViewProps & {
  padded?: boolean;
};

export function Card({ style, children, padded = true, ...rest }: Props) {
  const c = useThemeColors();
  return (
    <View
      style={[
        styles.card,
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
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
