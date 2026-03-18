import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createTaskTimeLogSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    taskId: objectIdSchema,
  }),
  body: z
    .object({
      startedAt: z.coerce.date(),
      endedAt: z.coerce.date().nullable().optional(),
      billable: z.boolean().optional(),
      note: z.string().trim().max(1000).nullable().optional(),
    })
    .strict(),
});

export const updateTaskTimeLogSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    timeLogId: objectIdSchema,
  }),
  body: z
    .object({
      startedAt: z.coerce.date().optional(),
      endedAt: z.coerce.date().nullable().optional(),
      billable: z.boolean().optional(),
      note: z.string().trim().max(1000).nullable().optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listTaskTimeLogsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    taskId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const getTaskTimeLogByIdSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    timeLogId: objectIdSchema,
  }),
});

export const deleteTaskTimeLogSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    timeLogId: objectIdSchema,
  }),
});
