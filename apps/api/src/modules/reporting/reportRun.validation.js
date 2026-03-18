import { z } from "zod";

const scopeSchema = z.object({
  type: z.enum(["TENANT", "DEPARTMENT", "TEAM", "USER", "CUSTOM"]).default("TENANT"),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  customFilters: z.record(z.any()).optional().default({})
});

export const runTemplateSchema = z.object({
  body: z.object({
    period: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
      label: z.string().optional()
    }).refine(
      (data) => {
        const diff = data.to.getTime() - data.from.getTime();
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        return diff > 0 && diff <= oneYear;
      },
      {
        message: "Period must be positive and not exceed 1 year"
      }
    ),
    scope: scopeSchema.optional(),
    output: z.object({
      formats: z.array(z.enum(["PDF", "XLSX", "CSV", "JSON", "HTML"])).default(["PDF"])
    }).optional()
  }),
  query: z.object({}),
  params: z.object({
    templateId: z.string()
  })
});

export const listRunsSchema = z.object({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    templateId: z.string().optional(),
    scheduleId: z.string().optional(),
    status: z.enum(["queued", "running", "success", "failed"]).optional(),
    triggerType: z.enum(["manual", "schedule", "api"]).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional()
  }),
  params: z.object({})
});
