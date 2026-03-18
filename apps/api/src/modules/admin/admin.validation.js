/**
 * Admin validation schemas. Zod schemas for admin metrics.
 */

import { z } from "zod";

/**
 * Schema for GET /admin/metrics
 */
export const getMetricsSchema = z.object({
  query: z.object({}).optional()
});

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const tenantAdminSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const breakGlassSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(10).max(1000),
  }).strict(),
});
