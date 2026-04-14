import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserStore {
  deviceId: string | null;
  name: string | null;
  role: 'user' | 'leader';
  isOnboarded: boolean;
  gatheringId: string | null;
  gatheringName: string | null;
  gatheringInviteCode: string | null;
  /** 모임장 `users.device_id` (gatherings.created_by) */
  gatheringOwnerDeviceId: string | null;
  setUser: (deviceId: string, name: string, role?: 'user' | 'leader') => void;
  /** DB와 동기화된 표시 이름만 갱신 */
  setName: (name: string) => void;
  setRole: (role: 'user' | 'leader') => void;
  setGathering: (id: string, name: string, inviteCode: string, gatheringOwnerDeviceId: string | null) => void;
  setGatheringOwner: (gatheringOwnerDeviceId: string | null) => void;
  clearGathering: () => void;
  setOnboarded: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      deviceId: null,
      name: null,
      role: 'user',
      isOnboarded: false,
      gatheringId: null,
      gatheringName: null,
      gatheringInviteCode: null,
      gatheringOwnerDeviceId: null,
      setUser: (deviceId, name, role) =>
        set((s) => ({
          deviceId,
          name,
          role: role ?? s.role,
        })),
      setName: (name) =>
        set({
          name: name.trim().length > 0 ? name.trim() : null,
        }),
      setRole: (role) => set({ role }),
      setGathering: (id, name, inviteCode, gatheringOwnerDeviceId) =>
        set({
          gatheringId: id,
          gatheringName: name,
          gatheringInviteCode: inviteCode,
          gatheringOwnerDeviceId,
        }),
      setGatheringOwner: (gatheringOwnerDeviceId) => set({ gatheringOwnerDeviceId }),
      clearGathering: () =>
        set({
          gatheringId: null,
          gatheringName: null,
          gatheringInviteCode: null,
          gatheringOwnerDeviceId: null,
        }),
      setOnboarded: () => set({ isOnboarded: true }),
    }),
    { name: 'user-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
