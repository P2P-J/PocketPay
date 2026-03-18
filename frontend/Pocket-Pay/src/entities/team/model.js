/**
 * Team Entity - 팀/멤버 관련 비즈니스 로직
 */

/** MongoDB _id / id 호환 ID 추출 */
export function getTeamId(team) {
  return team?.id || team?._id;
}

/** 현재 유저의 멤버 정보 찾기 */
export function findCurrentUserMember(members, user) {
  if (!members || !user) return null;

  const userId = user.userId || user._id || user.id;

  return members.find(
    (member) =>
      member.user?._id === userId ||
      member.user === userId
  );
}

/** 현재 유저가 팀 owner인지 확인 */
export function isTeamOwner(members, user) {
  const member = findCurrentUserMember(members, user);
  return member?.role === "owner";
}

/** 멤버를 가입일 순으로 정렬 */
export function sortMembersByJoinDate(members) {
  if (!members) return [];
  return [...members].sort((a, b) => {
    const dateA = new Date(a.joinedAt || 0);
    const dateB = new Date(b.joinedAt || 0);
    return dateA - dateB;
  });
}

/** 팀 ID 일치 여부 비교 */
export function isMatchingTeam(team, targetId) {
  return getTeamId(team) === targetId;
}
