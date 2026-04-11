export async function getMembership(id: number): Promise<any> {
  return await $fetch(`/api/memberships/${id}`);
}

function displayMember(
  id: number,
  username: string,
  username_last: string | undefined,
  skillIcons: string,
): string {
  return `#${id} ${username} ${username_last ?? ""} ${skillIcons}`.trimEnd();
}

type RequiredFields = {
  id: number;
  shifts_skills?: { shifts_skills_id: { icon: string } | null }[];
  memberships_user: {
    username: string;
    username_last: string;
  };
};

export function displayMembership<T extends RequiredFields>(mship: T) {
  const icons = (mship.shifts_skills ?? [])
    .map((s) => s.shifts_skills_id?.icon ?? "")
    .join("");
  return displayMember(
    mship.id,
    mship.memberships_user.username,
    mship.memberships_user.username_last,
    icons,
  );
}

export function displayAssignment(a: OccurrenceAssignment): string {
  const icons = a.skills.map((s) => s.icon).join("");
  return displayMember(a.membershipId, a.username, a.username_last, icons);
}
