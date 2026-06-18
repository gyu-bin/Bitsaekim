import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';

import { radius, shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  style?: ViewStyle;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  destructive,
  style,
}: Props) {
  const c = useThemeColors();
  const titleColor = destructive ? c.danger : c.text;

  const inner = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: c.accentMuted }]}>
        <Feather name={icon} size={18} color={destructive ? c.danger : c.accent} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.textSub }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={20} color={c.textSub} /> : null)}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.row,
          shadow.sm,
          { backgroundColor: c.card, borderColor: c.border },
          style,
        ]}
      >
        {inner}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.row,
        shadow.sm,
        { backgroundColor: c.card, borderColor: c.border },
        style,
      ]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...typeface.sansMedium, fontSize: fontSize.md },
  subtitle: { ...typeface.sans, fontSize: fontSize.sm, marginTop: 4, lineHeight: 19 },
});
