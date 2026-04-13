import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, shadow } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

export function Card({ style, children, ...rest }: ViewProps) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.card, shadow.sm, { backgroundColor: c.card, borderColor: c.border }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
  },
});
