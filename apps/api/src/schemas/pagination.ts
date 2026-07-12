import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // 500, not 100: the Measures and Consumption tabs have no pagination UI —
  // they render one table with everything for the building in a single
  // request (pageSize: 200) — so the cap has to comfortably exceed what
  // those single-page fetches ask for, not just be "a reasonable page size".
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function toLimitOffset(pagination: PaginationQuery): { limit: number; offset: number } {
  return {
    limit: pagination.pageSize,
    offset: (pagination.page - 1) * pagination.pageSize,
  };
}
