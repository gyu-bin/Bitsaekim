import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/fonts';
import { TAB_BAR_CONTENT_HEIGHT } from '@/constants/tabBar';
import { useThemeColors } from '@/hooks/useThemeColors';

const TAB_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  index: 'home',
  transcribe: 'edit-3',
  gallery: 'image',
  mypage: 'user',
};

const HIDDEN_TABS = new Set<string>([]);

const SPRING = { damping: 20, stiffness: 280, mass: 0.7 };

type TabItemProps = {
  focused: boolean;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
};

function TabItem({ focused, label, icon, onPress, accessibilityLabel }: TabItemProps) {
  const c = useThemeColors();
  const focus = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, focus]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: press.value * interpolate(focus.value, [0, 1], [1, 1.1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [0.45, 1]),
    transform: [{ translateY: interpolate(focus.value, [0, 1], [1, 0]) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
    transform: [{ scale: interpolate(focus.value, [0, 1], [0.4, 1]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.9, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(1, SPRING);
      }}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <Feather name={icon} size={19} color={focused ? c.text : c.textSub} />
        <Animated.View style={[styles.dot, dotStyle, { backgroundColor: c.accent }]} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          labelStyle,
          { color: focused ? c.text : c.textSub },
          focused && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => !HIDDEN_TABS.has(r.name));

  return (
    <View
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom, 4),
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
        },
      ]}
    >
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === routeIndex;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const icon = TAB_ICONS[route.name] ?? 'circle';

          const onPress = () => {
            void Haptics.selectionAsync();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={String(label)}
              icon={icon}
              onPress={onPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAB_BAR_CONTENT_HEIGHT,
    paddingTop: 4,
    paddingBottom: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 40,
    paddingVertical: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 24,
  },
  dot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    ...typography.chip,
    fontSize: 9,
  },
  labelActive: {
    ...typography.chip,
    fontSize: 9,
  },
});
