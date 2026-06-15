import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { tabBarClearance } from '@/constants/tabBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useToastStore, type ToastType } from '@/stores/toastStore';

function toastIcon(type: ToastType): React.ComponentProps<typeof Feather>['name'] {
  if (type === 'error') return 'alert-circle';
  if (type === 'info') return 'info';
  return 'check-circle';
}

export function ToastHost() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const toastBottom = tabBarClearance(insets.bottom);
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);
  const hide = useToastStore((s) => s.hide);

  if (!visible) return null;

  const iconColor = type === 'error' ? '#E5484D' : type === 'info' ? c.accent : '#30A46C';

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.host]}
    >
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(180)}
        style={[
          styles.toast,
          shadow.md,
          {
            bottom: toastBottom,
            backgroundColor: c.card,
            borderColor: c.border,
          },
        ]}
      >
        <Pressable
          onPress={hide}
          style={styles.inner}
          accessibilityRole="button"
          accessibilityLabel={message}
        >
          <Feather name={toastIcon(type)} size={20} color={iconColor} />
          <Text style={[styles.text, { color: c.text }]} numberOfLines={2}>
            {message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  text: {
    ...typeface.sansMedium,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
});
