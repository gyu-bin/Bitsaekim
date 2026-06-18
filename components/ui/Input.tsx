import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { radius } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';

export function Input(props: TextInputProps) {
  const c = useThemeColors();
  return (
    <TextInput
      placeholderTextColor={c.textSub}
      style={[
        styles.input,
        {
          color: c.text,
          backgroundColor: c.surface,
        },
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typeface.sans,
    fontSize: fontSize.md,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 15,
    minHeight: 52,
  },
});
