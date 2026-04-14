import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

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
          backgroundColor: c.card,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
