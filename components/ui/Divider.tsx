import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export function Divider() {
  const c = useThemeColors();
  return <View style={[styles.line, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, width: '100%' },
});
