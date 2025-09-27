export interface UserInfo {
  user: string;
  email: string;
  mship?: number;
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

export function getUserOrUndefined(event: any): UserInfo | undefined {
  const user = event.context.auth || undefined;
  return user;
}
