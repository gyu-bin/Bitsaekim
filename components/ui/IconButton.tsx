import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { radius } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

type Props = PressableProps & {
  icon: FeatherName;
  size?: number;
  color?: string;
  containerStyle?: ViewStyle;
  accessibilityLabel: string;
};

export function IconButton({
  icon,
  size = 20,
  color,
  containerStyle,
  onPress,
  accessibilityLabel,
  ...rest
}: Props) {
  const c = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(e) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: c.accentMuted, borderColor: c.border },
        pressed && styles.pressed,
        containerStyle,
      ]}
      {...rest}
    >
      <Feather name={icon} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
