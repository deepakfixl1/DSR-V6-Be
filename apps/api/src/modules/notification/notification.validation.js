import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listNotificationsSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      unreadOnly: z
        .string()
        .optional()
        .transform((v) => (v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : undefined))
    })
    .optional()
});

export const getUnreadCountSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});

export const markAllAsReadSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});

export const deleteNotificationSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});

export const listNotificationPreferencesSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional()
});

export const updateNotificationPreferencesSchema = z.object({
  query: z
    .object({
      tenantId: objectIdSchema.optional()
    })
    .optional(),
  body: z.object({
    preferences: z.array(
      z.object({
        channel: z.string().trim().min(1),
        type: z.string().trim().min(1),
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }).strict()
    ).min(1)
  }).strict()
});
