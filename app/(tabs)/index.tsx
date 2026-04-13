import { Redirect } from 'expo-router';

/** /(tabs) 단독 진입 시 첫 탭으로 보냄 (404 방지) */
export default function TabsIndex() {
  return <Redirect href="/(tabs)/transcribe" />;
}
