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
  /** 기기 이전용 6자리 복구 코드 (서버 동기화) */
  recoveryCode: string | null;
  /** 로컬 프로필 사진 file:// URI */
  profilePhotoUri: string | null;
  /** 서버에 동기화된 프로필 사진 public URL */
  avatarUrl: string | null;
  setUser: (deviceId: string, name: string, role?: 'user' | 'leader') => void;
  setRecoveryCode: (code: string | null) => void;
  setProfilePhoto: (uri: string | null) => void;
  setAvatarUrl: (url: string | null) => void;
  /** DB와 동기화된 표시 이름만 갱신 */
  setName: (name: string) => void;
  setRole: (role: 'user' | 'leader') => void;
  setGathering: (id: string, name: string, inviteCode: string, gatheringOwnerDeviceId: string | null) => void;
  setGatheringOwner: (gatheringOwnerDeviceId: string | null) => void;
  clearGathering: () => void;
  setOnboarded: () => void;
  /** 온보딩·모임 정보를 초기화합니다. deviceId는 유지합니다. */
  logout: () => void;
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
      recoveryCode: null,
      profilePhotoUri: null,
      avatarUrl: null,
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
      setRecoveryCode: (recoveryCode) => set({ recoveryCode }),
      setProfilePhoto: (profilePhotoUri) => set({ profilePhotoUri }),
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
      clearGathering: () =>
        set({
          gatheringId: null,
          gatheringName: null,
          gatheringInviteCode: null,
          gatheringOwnerDeviceId: null,
        }),
      setOnboarded: () => set({ isOnboarded: true }),
      logout: () =>
        set({
          name: null,
          role: 'user',
          isOnboarded: false,
          gatheringId: null,
          gatheringName: null,
          gatheringInviteCode: null,
          gatheringOwnerDeviceId: null,
          recoveryCode: null,
          profilePhotoUri: null,
          avatarUrl: null,
        }),
    }),
    { name: 'user-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
