import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const dashboardSchema = z.object({
  query: z.object({
    tenantId: objectId,
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});
