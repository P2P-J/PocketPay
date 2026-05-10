import type { User } from "./user";
import { getUserId } from "./user";

export interface Member {
  _id?: string;
  user:
    | {
        _id: string;
        name?: string;
        nickname?: string;
        handle?: string;
        email?: string;
      }
    | string;
  role: string;
  joinedAt?: string;
}

export type Account = {
  bank: string;
  number: string;
  holder: string;
};

export type TeamCategory = "friend" | "club";
export type TeamDisplayMode = "nickname" | "realName";
export type TeamAccountMode = "personal" | "team";

export interface Team {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  members?: Member[];
  category?: TeamCategory;
  displayMode?: TeamDisplayMode;
  accountMode?: TeamAccountMode;
  feeEnabled?: boolean;
  account?: Account;
  feeAmount?: number;
  feeDueDay?: number;
}

export function getTeamId(team: Team): string {
  return team.id || team._id || "";
}

export function isMatchingTeam(team: Team, targetId: string): boolean {
  return team.id === targetId || team._id === targetId;
}

export function isTeamOwner(members: Member[] | undefined, user: User | null): boolean {
  if (!members || !user) return false;
  const userId = getUserId(user);
  return members.some((m) => {
    const memberId = typeof m.user === "string" ? m.user : m.user._id;
    return memberId === userId && m.role === "owner";
  });
}

export function findCurrentUserMember(
  members: Member[] | undefined,
  user: User | null
): Member | undefined {
  if (!members || !user) return undefined;
  const userId = getUserId(user);
  return members.find((m) => {
    const memberId = typeof m.user === "string" ? m.user : m.user._id;
    return memberId === userId;
  });
}
