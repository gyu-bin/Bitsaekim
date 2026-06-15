import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { TAB_BAR_CONTENT_HEIGHT } from '@/constants/tabBar';
import { useThemeColors } from '@/hooks/useThemeColors';

const TAB_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  transcribe: 'edit-3',
  gallery: 'image',
  mypage: 'user',
};

const HIDDEN_TABS = new Set(['index']);

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const barWidth = isWide ? Math.min(380, width - 40) : width;

  const visibleRoutes = state.routes.filter((r) => !HIDDEN_TABS.has(r.name));

  return (
    <View
      style={[
        styles.host,
        {
          paddingBottom: insets.bottom,
          backgroundColor: isWide ? 'transparent' : c.tabBar,
          borderTopColor: isWide ? 'transparent' : c.tabBarBorder,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            width: barWidth,
            backgroundColor: c.tabBar,
            borderColor: c.tabBarBorder,
          },
          isWide ? styles.barWide : styles.barPhone,
          isWide && shadow.md,
        ]}
      >
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

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused && { backgroundColor: c.accentMuted },
                ]}
              >
                <Feather
                  name={icon}
                  size={22}
                  color={focused ? c.accent : c.textSub}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? c.accent : c.textSub },
                  focused && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAB_BAR_CONTENT_HEIGHT,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  barPhone: {
    borderTopWidth: 0,
  },
  barWide: {
    marginBottom: 10,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeface.sans,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  labelActive: {
    ...typeface.sansMedium,
  },
});
