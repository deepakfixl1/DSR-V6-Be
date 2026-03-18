import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const limitsSchema = z.object({
  tokensPerDay: z.number().int().min(0).nullable().optional().default(null),
  requestsPerDay: z.number().int().min(0).nullable().optional().default(null),
  tokensPerMonth: z.number().int().min(0).nullable().optional().default(null),
  requestsPerMonth: z.number().int().min(0).nullable().optional().default(null),
});

const statusSchema = z.enum(["active", "paused"]);

export const createPolicySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional().default(""),
    scope: z.enum(["tenant", "department", "user"]).default("tenant"),
    scopeId: objectIdSchema.nullable().optional().default(null),
    limits: limitsSchema,
    status: statusSchema.optional().default("active"),
  }),
});

export const updatePolicySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(500).optional(),
    scope: z.enum(["tenant", "department", "user"]).optional(),
    scopeId: objectIdSchema.nullable().optional(),
    limits: limitsSchema.partial().optional(),
    status: statusSchema.optional(),
  }).refine((b) => Object.keys(b).length > 0, "At least one field required"),
});

export const listPoliciesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    status: statusSchema.optional(),
    scope: z.enum(["tenant", "department", "user"]).optional(),
  }).optional().default({}),
});

export const policyParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const togglePolicySchema = policyParamsSchema;
