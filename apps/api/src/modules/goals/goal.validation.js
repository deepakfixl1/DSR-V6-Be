import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const keyResultSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    metricType: z.enum(["percentage", "number", "currency", "boolean"]),
    targetValue: z.number(),
    currentValue: z.number().optional(),
    weight: z.number().optional(),
    autoUpdateFrom: z.enum(["tasks", "reports", "manual"]).optional(),
    linkedMetricKey: z.string().optional(),
  })
  .strict();

export const createGoalSchema = z.object({
  body: z
    .object({
      type: z.enum(["company", "department", "team", "individual"]),
      parentGoalId: objectIdSchema.optional(),
      ownerId: objectIdSchema,
      teamId: objectIdSchema.optional(),
      departmentId: objectIdSchema.optional(),
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional(),
      period: z.object({
        type: z.enum(["yearly", "quarterly", "monthly"]),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
      keyResults: z.array(keyResultSchema).optional(),
      weightage: z.number().optional(),
      progress: z.number().optional(),
      status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).optional(),
      AIInsights: z
        .object({
          riskScore: z.number().optional(),
          prediction: z.string().optional(),
          trend: z.string().optional(),
        })
        .optional(),
    })
    .strict(),
});

export const updateGoalSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      parentGoalId: objectIdSchema.nullable().optional(),
      ownerId: objectIdSchema.optional(),
      teamId: objectIdSchema.nullable().optional(),
      departmentId: objectIdSchema.nullable().optional(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      period: z
        .object({
          type: z.enum(["yearly", "quarterly", "monthly"]),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
        })
        .optional(),
      keyResults: z.array(keyResultSchema).optional(),
      weightage: z.number().optional(),
      progress: z.number().optional(),
      status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).optional(),
      AIInsights: z
        .object({
          riskScore: z.number().optional(),
          prediction: z.string().optional(),
          trend: z.string().optional(),
        })
        .optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listGoalsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    ownerId: objectIdSchema.optional(),
    type: z.enum(["company", "department", "team", "individual"]).optional(),
    period: z.enum(["yearly", "quarterly", "monthly"]).optional(),
  }),
});

export const getGoalSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const deleteGoalSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const updateKeyResultSchema = z.object({
  params: z.object({
    id: objectIdSchema,
    krIndex: z.coerce.number().int().min(0),
  }),
  body: z
    .object({
      currentValue: z.number(),
    })
    .strict(),
});
