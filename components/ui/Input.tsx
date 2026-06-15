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
          borderColor: c.border,
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
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
});
