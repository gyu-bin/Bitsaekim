import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_seen';

export async function hasSeenOnboardingIntro(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === 'true';
}

export async function markOnboardingIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
