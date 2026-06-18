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
  /** ghost — 배경 없이 아이콘만 (마이턴 헤더 스타일) */
  variant?: 'filled' | 'ghost';
};

export function IconButton({
  icon,
  size = 20,
  color,
  containerStyle,
  onPress,
  accessibilityLabel,
  variant = 'filled',
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
        variant === 'filled' && { backgroundColor: c.surface },
        pressed && styles.pressed,
        containerStyle,
      ]}
      {...rest}
    >
      <Feather name={icon} size={size} color={color ?? c.textMid} />
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
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
