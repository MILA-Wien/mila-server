export async function getMembership(id: number) {
  return await $fetch(`/api/memberships/${id}`);
}

function displayMember(
  id: number,
  username: string,
  username_last: string | undefined,
  isCoordinator: boolean,
): string {
  return `#${id} ${username} ${username_last ?? ""} ${isCoordinator ? "(Koordinator*in)" : ""}`;
}

type RequiredFields = {
  id: number;
  shifts_can_be_coordinator: boolean;
  memberships_user: {
    username: string;
    username_last: string;
  };
};

export function displayMembership<T extends RequiredFields>(mship: T) {
  return displayMember(
    mship.id,
    mship.memberships_user.username,
    mship.memberships_user.username_last,
    mship.shifts_can_be_coordinator,
  );
}

export function displayAssignment(a: OccurrenceAssignment): string {
  return displayMember(
    a.membershipId,
    a.username,
    a.username_last,
    a.shifts_can_be_coordinator,
  );
}
