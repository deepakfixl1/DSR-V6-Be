import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const reportTypeEnum = z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]);
const contentSchema = z.union([z.array(z.record(z.any())), z.record(z.any())]);

export const createWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    reportType: reportTypeEnum,
    departmentId: objectIdSchema.optional(),
    templateId: objectIdSchema.optional(),
    period: z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    }),
    contentTitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    content: contentSchema.optional().default({}),
    goalIds: z.array(objectIdSchema).optional().default([]),
    sourceReportIds: z.array(objectIdSchema).optional().default([]),
    submissionDeadline: z.coerce.date().optional(),
  }).strict(),
});

export const updateWorkReportSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    contentTitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    content: contentSchema.optional(),
    goalIds: z.array(objectIdSchema).optional(),
    sourceReportIds: z.array(objectIdSchema).optional(),
    period: z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    }).optional(),
    templateId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listWorkReportsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    employeeMemberId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    reportType: reportTypeEnum.optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    excludeDraft: z.coerce.boolean().optional(),
  }),
});

export const listMyWorkReportsSchema = listWorkReportsSchema;

export const getWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema.optional(),
    id: objectIdSchema,
  }),
});

export const submitWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
});

export const getReportTemplateSchema = z.object({
  params: z.object({
    reportType: reportTypeEnum,
  }),
  query: z.object({
    departmentId: objectIdSchema,
  }),
});

export const reviewWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
  body: z.object({
    comments: z.string().trim().max(5000).optional(),
  }).strict().optional().default({}),
});

export const bulkApproveWorkReportsSchema = z.object({
  body: z.object({
    tenantId: objectIdSchema,
    reportIds: z.array(objectIdSchema).min(1).max(100),
    comments: z.string().trim().max(5000).optional(),
  }).strict(),
});

export const deleteWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
});

export const reopenWorkReportSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
});

export const workReportCommentsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
});

export const addWorkReportCommentSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    id: objectIdSchema,
  }),
  body: z.object({
    message: z.string().trim().min(1).max(5000),
  }).strict(),
});
