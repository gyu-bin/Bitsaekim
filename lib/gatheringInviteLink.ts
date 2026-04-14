import * as Linking from 'expo-linking';

/** 앱 설치 기기에서 열면 해당 모임 참여 화면으로 이동하는 초대 URL */
export function buildGatheringInviteUrl(inviteCode: string): string {
  const code = inviteCode.trim().toUpperCase().replace(/\s+/g, '');
  return Linking.createURL(`join/${encodeURIComponent(code)}`);
}
