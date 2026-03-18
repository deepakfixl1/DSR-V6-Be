import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const deadlineConfigSchema = z.object({
  cadence: z.enum(["daily", "weekly", "monthly"]),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).optional().default(0),
  timezone: z.string().trim().min(1).max(100).optional().default("Asia/Kolkata"),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional().default(null),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional().default(null),
});

const statusSchema = z.enum(["active", "paused"]);

export const createPolicySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional().default(""),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]),
    deadline: deadlineConfigSchema,
    lockAfterDeadline: z.boolean().optional().default(true),
    allowExtensionRequest: z.boolean().optional().default(true),
    gracePeriodMinutes: z.number().int().min(0).max(1440).optional().default(0),
    status: statusSchema.optional().default("active"),
  }),
});

export const updatePolicySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(500).optional(),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]).optional(),
    deadline: deadlineConfigSchema.optional(),
    lockAfterDeadline: z.boolean().optional(),
    allowExtensionRequest: z.boolean().optional(),
    gracePeriodMinutes: z.number().int().min(0).max(1440).optional(),
    status: statusSchema.optional(),
  }).refine((b) => Object.keys(b).length > 0, "At least one field required"),
});

export const listPoliciesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    status: statusSchema.optional(),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]).optional(),
  }).optional().default({}),
});

export const policyParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const togglePolicySchema = policyParamsSchema;
