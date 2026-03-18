import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listInvitesSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  query: z
    .object({
      status: z.enum(["pending", "accepted", "expired", "revoked"]).optional().default("pending"),
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    })
    .optional(),
});

export const resendInviteSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    inviteId: objectIdSchema,
  }),
  body: z
    .object({
      roleId: objectIdSchema.optional(),
    })
    .strict()
    .optional(),
});

export const cancelInviteSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    inviteId: objectIdSchema,
  }),
});

