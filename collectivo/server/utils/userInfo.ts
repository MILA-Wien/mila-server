export interface UserInfo {
  user: string;
  email: string;
  mship: number | null;
  studioAdmin: boolean;
  shiftAdmin: boolean;
}

interface MemberInfo extends UserInfo {
  mship: number;
}

export function getMemberOrThrowError(event: any): MemberInfo {
  const user = event.context.auth;
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.mship) {
    throw new Error("No membership associated with user");
  }
  return user;
}

export function getUserOrThrowError(event: any): UserInfo {
  const user = event.context.auth;
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function getUserOrNull(event: any): UserInfo | null {
  const user = event.context.auth || null;
  return user;
}
