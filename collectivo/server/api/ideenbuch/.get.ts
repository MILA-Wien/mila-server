import { z } from "zod";

function bool() {
  return z.enum(["true", "false"]).transform((val) => val === "true");
}

const PERPAGE = 10;

const querySchema = z.object({
  search: z.string().optional(),
  from_self: bool().optional(),
  has_answer: bool().optional(),
  page: z.coerce.number().default(1),
});

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse);
  const user = getMemberOrThrowError(event);
  const filter: Record<string, any> = {};

  if (query.search) {
    filter["_or"] = [
      {
        wunsch: { _contains: query.search },
      },
      {
        name: { _contains: query.search },
      },
    ];
  }

  if (query.from_self) {
    filter["wunsch_von"] = { _eq: user.mship };
  }

  if (query.has_answer) {
    filter["status"] = { _neq: "inarbeit" };
  }

  const [productRequests, totalCount] = await Promise.all([
    dbGetProductRequests(filter, query.page, PERPAGE),
    dbGetProductRequestsCount(filter),
  ]);

  return {
    data: productRequests,
    meta: {
      totalCount: totalCount?.[0]?.count ?? 0,
      page: query.page,
      perPage: PERPAGE,
    },
  };
});
