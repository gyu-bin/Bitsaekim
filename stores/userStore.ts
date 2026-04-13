import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserStore {
  deviceId: string | null;
  name: string | null;
  role: 'user' | 'leader';
  isOnboarded: boolean;
  setUser: (deviceId: string, name: string) => void;
  setRole: (role: 'user' | 'leader') => void;
  setOnboarded: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      deviceId: null,
      name: null,
      role: 'user',
      isOnboarded: false,
      setUser: (deviceId, name) => set({ deviceId, name }),
      setRole: (role) => set({ role }),
      setOnboarded: () => set({ isOnboarded: true }),
    }),
    { name: 'user-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
