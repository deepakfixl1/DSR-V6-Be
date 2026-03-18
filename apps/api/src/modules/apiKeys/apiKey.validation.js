import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listApiKeysSchema = z.object({
  query: z.object({
    tenantId: objectId,
  }),
});

export const createApiKeySchema = z.object({
  body: z.object({
    tenantId: objectId,
    name: z.string().trim().min(1).max(120),
    scopes: z.array(z.string().trim().min(1)).optional(),
    expiresAt: z.coerce.date().optional().nullable(),
  }).strict(),
});

export const updateApiKeySchema = z.object({
  params: z.object({
    id: objectId,
  }),
  query: z.object({
    tenantId: objectId,
  }),
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    scopes: z.array(z.string().trim().min(1)).optional(),
    expiresAt: z.coerce.date().optional().nullable(),
  }).strict(),
});

export const deleteApiKeySchema = z.object({
  params: z.object({
    id: objectId,
  }),
  query: z.object({
    tenantId: objectId,
  }),
});
