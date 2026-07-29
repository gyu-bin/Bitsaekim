import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { ToastHost } from '@/components/ui/ToastHost';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '홈',
            tabBarLabel: '홈',
            tabBarAccessibilityLabel: '홈 탭',
          }}
        />
        <Tabs.Screen
          name="transcribe"
          options={{
            title: '필사',
            tabBarLabel: '필사',
            tabBarAccessibilityLabel: '필사 탭',
          }}
        />
        <Tabs.Screen
          name="gallery"
          options={{
            title: '나눔',
            tabBarLabel: '나눔',
            tabBarAccessibilityLabel: '나눔 탭',
          }}
        />
        <Tabs.Screen
          name="mypage"
          options={{
            title: '마이페이지',
            tabBarLabel: '마이',
            tabBarAccessibilityLabel: '마이페이지 탭',
          }}
        />
      </Tabs>
      <ToastHost />
    </View>
  );
}
