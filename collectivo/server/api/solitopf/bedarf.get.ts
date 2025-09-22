import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const directus = useDirectusAdmin();
  return await directus.request(
    readItems("bedarfsmeldung_solitopf", {
      filter: {
        membership: {
          _eq: user.mship,
        },
      },
      sort: ["-date_created"],
    }),
  );
});
