import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { spacing } from '@/constants/colors';
import { typography } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeStore } from '@/stores/themeStore';

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
  style?: ViewStyle;
  large?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  badge,
  rightAction,
  showThemeToggle = false,
  style,
  large = true,
}: Props) {
  const c = useThemeColors();
  const toggleDark = useThemeStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.topRow}>
        <View style={styles.textCol}>
          {badge ? (
            <Text style={[styles.badge, { color: c.textSub }]} numberOfLines={1}>
              {badge}
            </Text>
          ) : null}
          <Text style={[large ? styles.titleLarge : styles.title, { color: c.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: c.textSub }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {rightAction}
          {showThemeToggle ? (
            <IconButton
              icon={isDark ? 'sun' : 'moon'}
              accessibilityLabel="다크 모드 전환"
              onPress={toggleDark}
              variant="ghost"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textCol: { flex: 1, minWidth: 0 },
  titleLarge: { ...typography.screenTitle },
  title: { ...typography.screenTitle, fontSize: 28, lineHeight: 34 },
  subtitle: { ...typography.screenSubtitle, marginTop: 8, maxWidth: 320 },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    ...typography.chip,
    fontSize: 12,
    maxWidth: '100%',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
});
