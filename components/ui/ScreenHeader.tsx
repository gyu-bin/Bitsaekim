import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { radius, spacing } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
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
            <View style={[styles.badge, { backgroundColor: c.accentMuted }]}>
              <Text style={[styles.badgeText, { color: c.accentDark }]} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          ) : null}
          <Text
            style={[
              large ? styles.titleLarge : styles.title,
              { color: c.text },
            ]}
          >
            {title}
          </Text>
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
  titleLarge: {
    ...typeface.sansMedium,
    fontSize: fontSize['3xl'],
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  title: {
    ...typeface.sansMedium,
    fontSize: fontSize['2xl'],
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 320,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  badgeText: { ...typeface.sansMedium, fontSize: fontSize.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
});
