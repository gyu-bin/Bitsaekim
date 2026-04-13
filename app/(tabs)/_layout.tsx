import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fonts } from '@/constants/fonts';
import { useThemeStore } from '@/stores/themeStore';

export default function TabLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const c = colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6);
  const tabBarH = 56 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSub,
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: fontSize.xs,
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 4 },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 4,
          paddingBottom: bottomPad,
          height: tabBarH,
          ...(Platform.OS === 'web'
            ? {}
            : {
                position: 'relative',
              }),
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: '시작',
        }}
      />
      <Tabs.Screen
        name="transcribe"
        options={{
          title: '필사',
          tabBarLabel: '필사',
          tabBarAccessibilityLabel: '필사 탭',
          tabBarIcon: ({ color, size }) => <Feather name="edit-3" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: '나눔',
          tabBarLabel: '나눔',
          tabBarAccessibilityLabel: '나눔 탭',
          tabBarIcon: ({ color, size }) => <Feather name="image" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarLabel: '마이페이지',
          tabBarAccessibilityLabel: '마이페이지 탭',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
