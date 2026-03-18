import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const taskStatusSchema = z.enum(["open", "in_progress", "done", "cancelled"]);
const taskPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const createTaskSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).nullable().optional(),
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      assigneeId: objectIdSchema.nullable().optional(),
      departmentId: objectIdSchema,
      projectId: objectIdSchema.nullable().optional(),
      dueAt: z.coerce.date().nullable().optional(),
      completedAt: z.coerce.date().nullable().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict(),
});

export const updateTaskSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    taskId: objectIdSchema,
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      assigneeId: objectIdSchema.nullable().optional(),
      departmentId: objectIdSchema.optional(),
      projectId: objectIdSchema.nullable().optional(),
      dueAt: z.coerce.date().nullable().optional(),
      completedAt: z.coerce.date().nullable().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listTasksSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    projectId: objectIdSchema.optional(),
    search: z.string().trim().optional(),
  }),
});

export const getTaskByIdSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    taskId: objectIdSchema,
  }),
});

export const deleteTaskSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    taskId: objectIdSchema,
  }),
});
