/**
 * Team Entity - 팀/멤버 관련 비즈니스 로직
 */

export interface Member {
  _id?: string;
  user: { _id: string; name?: string; email?: string } | string;
  role: string;
  joinedAt?: string;
}

export interface Team {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  color?: string;
  members?: Member[];
}

import type { User } from "@entities/user/model";

/** MongoDB _id / id 호환 ID 추출 */
export function getTeamId(team: Team | null | undefined): string | undefined {
  return team?.id || team?._id;
}

/** 현재 유저의 멤버 정보 찾기 */
export function findCurrentUserMember(members: Member[] | null | undefined, user: User | null | undefined): Member | undefined | null {
  if (!members || !user) return null;

  const userId = user.userId || user._id || user.id;

  return members.find(
    (member) =>
      (typeof member.user === "object" && member.user?._id === userId) ||
      member.user === userId
  );
}

/** 현재 유저가 팀 owner인지 확인 */
export function isTeamOwner(members: Member[] | null | undefined, user: User | null | undefined): boolean {
  const member = findCurrentUserMember(members, user);
  return member?.role === "owner";
}

/** 멤버를 가입일 순으로 정렬 */
export function sortMembersByJoinDate(members: Member[] | null | undefined): Member[] {
  if (!members) return [];
  return [...members].sort((a, b) => {
    const dateA = new Date(a.joinedAt || 0).getTime();
    const dateB = new Date(b.joinedAt || 0).getTime();
    return dateA - dateB;
  });
}

/** 팀 ID 일치 여부 비교 */
export function isMatchingTeam(team: Team | null | undefined, targetId: string | undefined): boolean {
  return getTeamId(team) === targetId;
}
