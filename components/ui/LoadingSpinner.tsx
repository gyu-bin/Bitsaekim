import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export function LoadingSpinner() {
  const c = useThemeColors();
  return (
    <View style={styles.wrap} accessibilityLabel="로딩 중">
      <ActivityIndicator size="large" color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: 'center', justifyContent: 'center' },
});
