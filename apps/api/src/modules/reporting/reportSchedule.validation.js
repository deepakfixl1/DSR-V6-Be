import { z } from "zod";
import parser from "cron-parser";

const IANA_TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London",
  "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
  "UTC", "America/Chicago", "America/Denver", "Asia/Dubai", "Asia/Singapore"
];

const validateCronExpression = (expr) => {
  try {
    parser.parseExpression(expr);
    return true;
  } catch {
    return false;
  }
};

const scopeSchema = z.object({
  type: z.enum(["TENANT", "DEPARTMENT", "TEAM", "USER", "CUSTOM"]).default("TENANT"),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  customFilters: z.record(z.any()).optional().default({})
});

const deliveryRecipientsSchema = z.object({
  userIds: z.array(z.string()).optional().default([]),
  emails: z.array(z.string().email()).optional().default([]),
  slackChannelIds: z.array(z.string()).optional().default([]),
  webhookUrls: z.array(z.string().url()).optional().default([])
});

const deliverySchema = z.object({
  channels: z.array(z.enum(["IN_APP", "EMAIL", "SLACK", "WEBHOOK"])).default(["IN_APP"]),
  recipients: deliveryRecipientsSchema.optional(),
  subjectTemplate: z.string().optional(),
  messageTemplate: z.string().optional()
});

const outputSchema = z.object({
  formats: z.array(z.enum(["PDF", "XLSX", "CSV", "JSON", "HTML"])).default(["PDF"]),
  includeBranding: z.boolean().default(true)
});

const createScheduleBodySchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(200),
  status: z.enum(["active", "paused", "disabled"]).default("active"),
  scope: scopeSchema.optional(),
  cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CRON"]),
  cronExpr: z.string().optional(),
  timezone: z.string().refine((tz) => IANA_TIMEZONES.includes(tz), {
    message: "Invalid IANA timezone"
  }).default("Asia/Kolkata"),
  runAt: z.object({
    hour: z.number().int().min(0).max(23).default(9),
    minute: z.number().int().min(0).max(59).default(0)
  }).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  delivery: deliverySchema.optional(),
  output: outputSchema.optional()
}).refine(
  (data) => {
    if (data.cadence === "CRON") {
      return data.cronExpr && validateCronExpression(data.cronExpr);
    }
    return true;
  },
  {
    message: "Valid cronExpr required when cadence is CRON",
    path: ["cronExpr"]
  }
).refine(
  (data) => {
    if (data.cadence === "WEEKLY") {
      return data.weekday !== undefined;
    }
    return true;
  },
  {
    message: "weekday required when cadence is WEEKLY",
    path: ["weekday"]
  }
).refine(
  (data) => {
    if (data.cadence === "MONTHLY") {
      return data.dayOfMonth !== undefined;
    }
    return true;
  },
  {
    message: "dayOfMonth required when cadence is MONTHLY",
    path: ["dayOfMonth"]
  }
).refine(
  (data) => {
    if (data.cadence === "QUARTERLY") {
      return data.quarter !== undefined && data.dayOfMonth !== undefined;
    }
    return true;
  },
  {
    message: "quarter and dayOfMonth required when cadence is QUARTERLY",
    path: ["quarter"]
  }
).refine(
  (data) => {
    if (data.cadence === "YEARLY") {
      return data.monthOfYear !== undefined && data.dayOfMonth !== undefined;
    }
    return true;
  },
  {
    message: "monthOfYear and dayOfMonth required when cadence is YEARLY",
    path: ["monthOfYear"]
  }
);

export const createScheduleSchema = z.object({
  body: createScheduleBodySchema,
  query: z.object({}),
  params: z.object({})
});

export const updateScheduleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    status: z.enum(["active", "paused", "disabled"]).optional(),
    scope: scopeSchema.optional(),
    cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CRON"]).optional(),
    cronExpr: z.string().optional(),
    timezone: z.string().refine((tz) => IANA_TIMEZONES.includes(tz), {
      message: "Invalid IANA timezone"
    }).optional(),
    runAt: z.object({
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59)
    }).optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    monthOfYear: z.number().int().min(1).max(12).optional(),
    quarter: z.number().int().min(1).max(4).optional(),
    delivery: deliverySchema.optional(),
    output: outputSchema.optional()
  }),
  query: z.object({}),
  params: z.object({
    scheduleId: z.string()
  })
});

export const listSchedulesSchema = z.object({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    templateId: z.string().optional(),
    status: z.enum(["active", "paused", "disabled"]).optional(),
    cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CRON"]).optional()
  }),
  params: z.object({})
});

export const upcomingSchedulesSchema = z.object({
  body: z.object({}),
  query: z.object({
    hours: z.coerce.number().int().positive().max(168).default(24)
  }),
  params: z.object({})
});
