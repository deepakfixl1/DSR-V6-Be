import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const dsrSuggestionSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
    date: z.coerce.date().optional(),
  }),
});

export const reportAnalysisSchema = z.object({
  params: z.object({
    reportId: objectIdSchema,
  }),
});

export const periodAnalysisSchema = z.object({
  query: z.object({
    employeeMemberId: objectIdSchema.optional(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    reportType: z.enum(["WSR", "MSR", "QSR", "YSR"]),
  }),
});
