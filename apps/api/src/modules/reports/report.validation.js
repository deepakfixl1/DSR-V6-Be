import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createReportSchema = z.object({
  body: z
    .object({
      templateId: objectIdSchema,
      teamId: objectIdSchema.optional(),
      departmentId: objectIdSchema.optional(),
      period: z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
      data: z.record(z.any()).optional(),
    })
    .strict(),
});

export const updateReportSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      teamId: objectIdSchema.nullable().optional(),
      departmentId: objectIdSchema.nullable().optional(),
      period: z
        .object({
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
        })
        .optional(),
      data: z.record(z.any()).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listReportsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    templateId: objectIdSchema.optional(),
    userId: objectIdSchema.optional(),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
  }),
});

export const getReportSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const submitReportSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const approveReportSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      comments: z.string().trim().max(2000).optional(),
    })
    .strict()
    .optional()
    .default({}),
});

export const rejectReportSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      comments: z.string().trim().max(2000).optional(),
    })
    .strict()
    .optional()
    .default({}),
});
