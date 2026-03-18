import { z } from "zod";

const sectionSourceSchema = z.object({
  module: z.string().min(1),
  entity: z.string().min(1),
  baseFilters: z.record(z.any()).optional().default({}),
  groupBy: z.record(z.any()).optional(),
  metrics: z.array(z.record(z.any())).optional().default([]),
  sort: z.record(z.any()).optional(),
  limit: z.number().int().positive().optional()
});

const sectionViewSchema = z.object({
  type: z.enum(["TABLE", "CHART", "TEXT", "KPI", "LIST"]).default("TABLE"),
  columns: z.array(z.record(z.any())).optional().default([]),
  chart: z.record(z.any()).optional(),
  template: z.string().optional()
});

const sectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  enabled: z.boolean().default(true),
  source: sectionSourceSchema,
  view: sectionViewSchema
});

const outputDefaultsSchema = z.object({
  formats: z.array(z.enum(["PDF", "XLSX", "CSV", "JSON", "HTML"])).default(["PDF"]),
  timezone: z.string().default("Asia/Kolkata"),
  locale: z.string().default("en-IN"),
  currency: z.string().default("INR"),
  includeBranding: z.boolean().default(true)
});

const accessSchema = z.object({
  minPermission: z.string().default("reports.view"),
  allowedRoleIds: z.array(z.string()).optional().default([]),
  allowedUserIds: z.array(z.string()).optional().default([])
});

const createTemplateBodySchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  reportType: z.enum(["DSR", "WSR", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]),
  departmentScope: z.enum(["ALL", "SELECTED"]).default("ALL"),
  departmentIds: z.array(z.string()).optional().default([]),
  teamIds: z.array(z.string()).optional().default([]),
  userIds: z.array(z.string()).optional().default([]),
  sections: z.array(sectionSchema).min(1).max(50),
  outputDefaults: outputDefaultsSchema.optional(),
  access: accessSchema.optional(),
  status: z.enum(["active", "disabled"]).default("active")
}).refine(
  (data) => {
    if (data.departmentScope === "SELECTED") {
      return data.departmentIds && data.departmentIds.length > 0;
    }
    return true;
  },
  {
    message: "departmentIds required when departmentScope is SELECTED",
    path: ["departmentIds"]
  }
).refine(
  (data) => {
    if (data.departmentScope === "ALL") {
      return !data.departmentIds || data.departmentIds.length === 0;
    }
    return true;
  },
  {
    message: "departmentIds must be empty when departmentScope is ALL",
    path: ["departmentIds"]
  }
);

export const createTemplateSchema = z.object({
  body: createTemplateBodySchema,
  query: z.object({}),
  params: z.object({})
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    reportType: z.enum(["DSR", "WSR", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]).optional(),
    departmentScope: z.enum(["ALL", "SELECTED"]).optional(),
    departmentIds: z.array(z.string()).optional(),
    teamIds: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    sections: z.array(sectionSchema).min(1).max(50).optional(),
    outputDefaults: outputDefaultsSchema.optional(),
    access: accessSchema.optional(),
    status: z.enum(["active", "disabled"]).optional()
  }),
  query: z.object({}),
  params: z.object({
    templateId: z.string()
  })
});

export const updateTemplateStatusSchema = z.object({
  body: z.object({
    status: z.enum(["active", "disabled"])
  }),
  query: z.object({}),
  params: z.object({
    templateId: z.string()
  })
});

export const listTemplatesSchema = z.object({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    reportType: z.enum(["DSR", "WSR", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]).optional(),
    status: z.enum(["active", "disabled"]).optional(),
    search: z.string().optional()
  }),
  params: z.object({})
});
