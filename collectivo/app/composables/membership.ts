export async function getMembership(id: number) {
  return await $fetch(`/api/memberships/${id}`);
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
  const user = mship.memberships_user;
  return `#${mship.id} ${user.username} ${user.username_last ?? ""} ${mship.shifts_can_be_coordinator ? "(Koordinator*in)" : ""}`;
}
