export interface User {
  userId?: string;
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  provider?: string;
}

export function getUserId(user: User | null | undefined): string | undefined {
  return user?.userId || user?._id || user?.id;
}

export function isLocalUser(user: User | null | undefined): boolean {
  return user?.provider === "local";
}
