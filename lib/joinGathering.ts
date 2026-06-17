export const INVALID_INVITE_CODE_MESSAGE =
  '초대 코드가 유효하지 않아요. 모임장에게 새 코드를 요청하세요';

export function isInvalidInviteCodeError(error: { message?: string } | null | undefined): boolean {
  const msg = error?.message ?? '';
  return msg.includes('유효하지 않') || msg.includes('P0003');
}
