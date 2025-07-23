import { readItem } from "@directus/sdk";

export async function getMembership(id: number) {
  const directus = useDirectus();
  return await directus.request(
    readItem("memberships", id, {
      fields: [
        "id",
        { memberships_user: ["first_name", "last_name"] },
        "memberships_type",
        "memberships_status",
        "shifts_categories_allowed",
        "shifts_user_type",
        "shifts_can_be_coordinator",
      ],
    }),
  );
}

type RequiredFields = {
  id: number;
  shifts_can_be_coordinator: boolean;
  memberships_user: {
    first_name: string;
    last_name: string;
  };
};

export function displayMembership<T extends RequiredFields>(mship: T) {
  const user = mship.memberships_user;
  return `#${mship.id} ${user.first_name} ${user.last_name} ${mship.shifts_can_be_coordinator ? "(Koordinator*in)" : ""}`;
}
