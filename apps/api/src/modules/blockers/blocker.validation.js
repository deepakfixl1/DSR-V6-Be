import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const blockerTypeSchema = z.enum(["technical", "dependency", "approval", "external", "other"]);
const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const statusSchema = z.enum(["open", "in_progress", "escalated", "resolved", "closed"]);

export const createBlockerSchema = z.object({
  body: z
    .object({
      assigneeId: objectIdSchema.optional(),
      teamId: objectIdSchema.optional(),
      departmentId: objectIdSchema.optional(),
      type: blockerTypeSchema,
      severity: severitySchema.optional(),
      status: statusSchema.optional(),
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional(),
      relatedTaskIds: z.array(objectIdSchema).optional(),
      relatedGoalIds: z.array(objectIdSchema).optional(),
      relatedReportId: objectIdSchema.optional(),
      linkedBlockerIds: z.array(objectIdSchema).optional(),
      priority: prioritySchema.optional(),
      watchers: z.array(objectIdSchema).optional(),
      SLA: z
        .object({
          expectedResolutionHours: z.number().optional(),
          dueAt: z.coerce.date().optional(),
        })
        .optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict(),
});

export const updateBlockerSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      assigneeId: objectIdSchema.nullable().optional(),
      teamId: objectIdSchema.nullable().optional(),
      departmentId: objectIdSchema.nullable().optional(),
      type: blockerTypeSchema.optional(),
      severity: severitySchema.optional(),
      status: statusSchema.optional(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      relatedTaskIds: z.array(objectIdSchema).optional(),
      relatedGoalIds: z.array(objectIdSchema).optional(),
      relatedReportId: objectIdSchema.nullable().optional(),
      linkedBlockerIds: z.array(objectIdSchema).optional(),
      priority: prioritySchema.optional(),
      watchers: z.array(objectIdSchema).optional(),
      SLA: z
        .object({
          expectedResolutionHours: z.number().optional(),
          dueAt: z.coerce.date().nullable().optional(),
          breached: z.boolean().optional(),
        })
        .optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listBlockersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: statusSchema.optional(),
    severity: severitySchema.optional(),
    tenantId: objectIdSchema.optional(),
    assigneeId: objectIdSchema.optional(),
    reporterId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    noDepartment: z.enum(["true", "false"]).optional(),
  }),
});

export const getBlockerSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const escalateBlockerSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      escalatedTo: objectIdSchema.optional(),
    })
    .strict()
    .optional()
    .default({}),
});

export const resolveBlockerSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      resolutionNote: z.string().trim().max(5000).optional(),
    })
    .strict()
    .optional()
    .default({}),
});

export const closeBlockerSchema = getBlockerSchema;
export const deleteBlockerSchema = getBlockerSchema;
export const blockerStatsSchema = z.object({
  query: z.object({
    tenantId: objectIdSchema.optional(),
  }),
});
export const slaBreachedBlockersSchema = blockerStatsSchema;
