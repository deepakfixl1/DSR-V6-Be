import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const triggerEventSchema = z.enum([
  "goal.created",
  "goal.updated",
  "goal.deleted",
  "goal.completed",
  "goal.status_changed",
  "report.submitted",
  "report.approved",
  "report.rejected",
  "blocker.created",
  "blocker.escalated",
  "blocker.resolved",
  "member.joined",
  "member.removed",
]);

const conditionOperatorSchema = z.enum(["eq", "neq", "in", "contains", "gt", "lt", "exists"]);

const conditionSchema = z.object({
  field: z.string().trim().min(1).max(100),
  operator: conditionOperatorSchema,
  value: z.any().optional(),
});

const actionTypeSchema = z.enum([
  "send_email",
  "send_notification",
  "create_audit_entry",
  "webhook",
]);

const actionSchema = z.object({
  type: actionTypeSchema,
  config: z.record(z.any()).optional().default({}),
});

const statusSchema = z.enum(["active", "paused", "draft"]);

// ─── Create ──────────────────────────────────────────────────────────────────

export const createAutomationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional().default(""),
    status: statusSchema.optional().default("draft"),
    trigger: z.object({
      event: triggerEventSchema,
    }),
    conditions: z.array(conditionSchema).optional().default([]),
    actions: z.array(actionSchema).min(1, "At least one action is required"),
  }),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateAutomationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(500).optional(),
      status: statusSchema.optional(),
      trigger: z
        .object({
          event: triggerEventSchema,
        })
        .optional(),
      conditions: z.array(conditionSchema).optional(),
      actions: z.array(actionSchema).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

// ─── List ────────────────────────────────────────────────────────────────────

export const listAutomationsSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      status: statusSchema.optional(),
      trigger: z.string().trim().optional(),
    })
    .optional()
    .default({}),
});

// ─── Params (id) ─────────────────────────────────────────────────────────────

export const automationParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// ─── Toggle ──────────────────────────────────────────────────────────────────

export const toggleAutomationSchema = automationParamsSchema;

// ─── Run ─────────────────────────────────────────────────────────────────────

export const runAutomationSchema = automationParamsSchema;

// ─── Logs ────────────────────────────────────────────────────────────────────

export const listAutomationLogsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    })
    .optional()
    .default({}),
});

// ─── Stats ───────────────────────────────────────────────────────────────────

export const automationStatsSchema = z.object({
  query: z.object({}).optional().default({}),
});
