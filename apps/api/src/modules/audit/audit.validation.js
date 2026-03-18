import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listAuditSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional(),
      entityType: z.string().min(1).trim().optional(),
      entityId: objectIdSchema.optional(),
      actorId: objectIdSchema.optional(),
      action: z.string().min(1).trim().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      from: z.string().min(1).optional(),
    })
    .optional()
});

export const getAuditSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});
