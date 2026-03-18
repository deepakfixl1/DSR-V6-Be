/**
 * Billing validation schemas. Zod schemas for plan and subscription operations.
 */

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const featuresSchema = z
  .object({
    rbac: z.boolean().optional(),
    auditLogs: z.boolean().optional(),
    apiAccess: z.boolean().optional(),
    automationWorkers: z.boolean().optional(),
    advancedSecurity: z.boolean().optional(),
    sso: z.boolean().optional()
  })
  .optional();

const limitsSchema = z
  .object({
    maxUsers: z.number().int().min(0).optional(),
    maxStorageGB: z.number().int().min(0).optional(),
    maxApiCallsPerMonth: z.number().int().min(0).optional(),
    auditLogRetentionDays: z.number().int().min(0).optional(),
    maxAITokensPerMonth: z.number().int().min(0).optional(),
    maxAIReportsPerMonth: z.number().int().min(0).optional(),
  })
  .optional();

/**
 * Schema for POST /billing/plans
 */
export const createPlanSchema = z.object({
  body: z.object({
    planCode: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
    name: z.string().min(1).max(128),
    stripePriceId: z.string().min(1).trim(),
    duration: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
    features: featuresSchema,
    limits: limitsSchema,
    metadata: z.record(z.unknown()).optional()
  })
});

/**
 * Schema for PATCH /billing/plans/:planId
 */
export const updatePlanSchema = z.object({
  params: z.object({
    planId: objectIdSchema
  }),
  body: z
    .object({
      name: z.string().min(1).max(128).optional(),
      stripePriceId: z.string().min(1).trim().optional(),
      duration: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
      features: featuresSchema,
      limits: limitsSchema,
      metadata: z.record(z.unknown()).optional()
    })
    .strict()
});

/**
 * Schema for PATCH /billing/plans/:planId/toggle
 */
export const togglePlanSchema = z.object({
  params: z.object({
    planId: objectIdSchema
  })
});

/**
 * Schema for DELETE /billing/plans/:planId
 */
export const deletePlanSchema = z.object({
  params: z.object({
    planId: objectIdSchema
  })
});

/**
 * Schema for GET /billing/plans
 */
export const listPlansSchema = z.object({
  query: z
    .object({
      activeOnly: z
        .string()
        .optional()
        .transform((v) => v === "true" || v === "1")
    })
    .optional()
});

/**
 * Schema for GET /billing/:tenantId/subscription
 */
export const getSubscriptionSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  })
});

/**
 * Schema for POST /billing/:tenantId/subscribe
 */
export const subscribeSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  }),
  body: z.object({
    planId: objectIdSchema,
    paymentMethodId: z.string().optional()
  })
});

/**
 * Schema for POST /billing/:tenantId/upgrade
 */
export const upgradeSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  }),
  body: z.object({
    planId: objectIdSchema
  })
});

/**
 * Schema for POST /billing/:tenantId/cancel
 */
export const cancelSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  })
});

/**
 * Schema for POST /billing/:tenantId/resume
 */
export const resumeSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  })
});

/**
 * Schema for GET /billing/invoices (admin only)
 */
export const listInvoicesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional()
    })
    .optional()
});

/**
 * Schema for GET /billing/analytics
 */
export const getAnalyticsSchema = z.object({
  query: z.object({}).optional()
});

/**
 * Schema for POST /billing/:tenantId/create-checkout-session
 */
export const checkoutSessionSchema = z.object({
  params: z.object({ tenantId: objectIdSchema }),
  body: z.object({
    planId: objectIdSchema,
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  }),
});

/**
 * Schema for POST /billing/:tenantId/create-portal-session
 */
export const portalSessionSchema = z.object({
  params: z.object({ tenantId: objectIdSchema }),
  body: z.object({
    returnUrl: z.string().url(),
  }),
});
