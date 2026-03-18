/**
 * Tenant validation schemas. Zod schemas for tenant CRUD and settings.
 */

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Schema for POST /tenants (create tenant invite — owner must accept to create tenant).
 */
export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(128).trim(),
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens only"),
    ownerEmail: z.string().email("Valid owner email is required"),
    ownerName: z.string().max(128).trim().optional(),
    planId: objectIdSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Schema for GET /tenants/:tenantId
 */
export const getTenantSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

/**
 * Schema for PATCH /tenants/:tenantId
 */
export const updateTenantSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z
    .object({
      name: z.string().min(1).max(128).trim().optional(),
      metadata: z.record(z.unknown()).optional(),
      status: z.enum(["active", "suspended", "trial"]).optional(),
      suspendedUntil: z.coerce.date().optional().nullable(),
      readOnlyMode: z.boolean().optional(),
      readOnlyUntil: z.coerce.date().optional().nullable(),
    })
    .strict(),
});

/**
 * Schema for DELETE /tenants/:tenantId
 */
export const deleteTenantSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

/**
 * Schema for POST /tenants/invites/:inviteId/reinvite
 */
export const reinviteTenantSchema = z.object({
  params: z.object({
    inviteId: objectIdSchema,
  }),
});

/**
 * Schema for GET /tenants/:tenantId/settings
 */
export const getSettingsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

/**
 * Schema for PATCH /tenants/:tenantId/settings
 */
export const updateSettingsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z
    .object({
      branding: z.record(z.unknown()).optional(),
      security: z.record(z.unknown()).optional(),
      notifications: z.record(z.unknown()).optional(),
    })
    .strict(),
});

export const settingsSectionSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

export const updateGeneralSettingsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    companyName: z.string().optional(),
    logoUrl: z.string().url().optional().nullable(),
    timezone: z.string().optional(),
    industry: z.string().optional().nullable(),
  }).strict(),
});

export const updateReportConfigSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    submissionWindowHours: z.number().min(1).optional(),
    allowReopen: z.boolean().optional(),
    lockAfterDeadline: z.boolean().optional(),
  }).strict(),
});

export const updateAiConfigSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    enabled: z.boolean().optional(),
    maxTokensPerUser: z.number().min(0).optional(),
    approvalRequired: z.boolean().optional(),
  }).strict(),
});

export const updateLateSubmissionLockSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    enabled: z.boolean(),
    gracePeriodHours: z.number().min(0).optional(),
  }).strict(),
});
