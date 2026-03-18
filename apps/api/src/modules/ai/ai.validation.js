import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const dsrSuggestionSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
    date: z.coerce.date().optional(),
    tenantId: z.string().optional(),
  }),
});

export const goalsPendingSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
  }),
});

export const goalsRecommendationSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
  }),
});

export const analyzeReportSchema = z.object({
  body: z.object({
    reportId: objectIdSchema,
  }).strict(),
});

export const reportAnalysisSchema = z.object({
  params: z.object({
    reportId: objectIdSchema,
  }),
});

export const goalProgressAnalysisSchema = z.object({
  params: z.object({
    goalId: objectIdSchema,
  }),
});

export const periodAnalysisSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  }),
});
