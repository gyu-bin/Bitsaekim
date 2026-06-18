import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/fonts';
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
      <Feather name={icon} size={32} color={c.textSub} style={styles.icon} />
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: c.textSub }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  icon: { marginBottom: 12, opacity: 0.7 },
  title: { ...typography.cardTitle, textAlign: 'center' },
  desc: {
    ...typography.screenSubtitle,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
});
