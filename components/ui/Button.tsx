import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'ghost' | 'outline';
  loading?: boolean;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  textStyle,
  containerStyle,
  onPress,
  ...rest
}: Props) {
  const c = useThemeColors();

  const handlePress: PressableProps['onPress'] = (e) => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: c.accent },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        variant === 'outline' && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: c.border,
        },
        (pressed || disabled) && { opacity: 0.85 },
        containerStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : c.accent} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color:
                variant === 'primary' ? '#fff' : variant === 'outline' ? c.text : c.accent,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    ...typeface.sansMedium,
    fontSize: fontSize.md,
  },
});
