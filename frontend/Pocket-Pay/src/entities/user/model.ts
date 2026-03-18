/**
 * User Entity - 유저 관련 비즈니스 로직
 */

export interface User {
  userId?: string;
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  provider?: string;
}

/** 유저 ID 추출 (다양한 형식 호환) */
export function getUserId(user: User | null | undefined): string | undefined {
  return user?.userId || user?._id || user?.id;
}

/** 로컬(이메일) 가입 유저 여부 */
export function isLocalUser(user: User | null | undefined): boolean {
  return user?.provider === "local";
}
