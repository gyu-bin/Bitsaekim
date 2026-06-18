import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  compact?: boolean;
  style?: ViewStyle;
};

export function LoadingSpinner({ compact, style }: Props) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.wrap, compact && styles.compact, style]}
      accessibilityLabel="로딩 중"
    >
      <ActivityIndicator size={compact ? 'small' : 'large'} color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  compact: { paddingVertical: spacing.md },
});
