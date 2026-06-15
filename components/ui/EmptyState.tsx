import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  icon?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description?: string;
};

export function EmptyState({ icon = 'inbox', title, description }: Props) {
  const c = useThemeColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: c.accentMuted, borderColor: c.border }]}>
        <Feather name={icon} size={28} color={c.accent} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: c.textSub }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  title: { ...typeface.sansMedium, fontSize: fontSize.lg, textAlign: 'center' },
  desc: {
    ...typeface.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
});
