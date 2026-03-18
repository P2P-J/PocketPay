/**
 * User Entity - 유저 관련 비즈니스 로직
 */

/** 유저 ID 추출 (다양한 형식 호환) */
export function getUserId(user) {
  return user?.userId || user?._id || user?.id;
}

/** 로컬(이메일) 가입 유저 여부 */
export function isLocalUser(user) {
  return user?.provider === "local";
}
