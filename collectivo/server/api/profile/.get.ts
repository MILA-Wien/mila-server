import { readUser } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);
  const directus = useDirectusAdmin();
  return await directus.request(
    readUser(user.user, {
      fields: [
        "*",
        "role.name",
        "memberships.*",
        "memberships.shifts_categories_allowed.shifts_categories_id",
        "collectivo_tags.collectivo_tags_id",
      ],
    }),
  );
});
