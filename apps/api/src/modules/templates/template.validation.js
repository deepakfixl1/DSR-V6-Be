import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const fieldTypeSchema = z
  .string()
  .regex(/^(core\.[a-zA-Z]+|plugin\.[a-zA-Z0-9_.-]+)$/);

const fieldSchema = z
  .object({
    fieldId: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(200),
    type: fieldTypeSchema,
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    validation: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        regex: z.string().optional(),
        maxLength: z.number().int().optional(),
      })
      .optional(),
    AIEnabled: z.boolean().optional(),
    autoFillFrom: z.enum(["tasks", "goals", "previousReport"]).nullable().optional(),
    scoringWeight: z.number().optional(),
    conditionalLogic: z
      .object({
        dependsOnField: z.string().optional(),
        condition: z.string().optional(),
        value: z.any().optional(),
      })
      .optional(),
  })
  .strict();

const sectionSchema = z
  .object({
    sectionId: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    order: z.number().int().optional(),
    fields: z.array(fieldSchema).optional(),
  })
  .strict();

export const createTemplateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(200),
      code: z.string().trim().min(1).max(100),
      type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]),
      reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR", "CUSTOM"]).optional(),
      targetAudience: z.enum(["individual", "team", "department", "company"]),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      isSystemTemplate: z.boolean().optional(),
      departmentId: objectIdSchema.nullable().optional(),
      scheduleConfig: z
        .object({
          required: z.boolean().optional(),
          dueTime: z.string().optional(),
          autoReminder: z.boolean().optional(),
          gracePeriodHours: z.number().int().min(0).optional(),
        })
        .optional(),
      scoringConfig: z
        .object({
          enabled: z.boolean().optional(),
          maxScore: z.number().min(1).optional(),
          calculationLogic: z.string().optional(),
        })
        .optional(),
      sections: z.array(sectionSchema).optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict(),
});

export const updateTemplateSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]).optional(),
      reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR", "CUSTOM"]).optional(),
      targetAudience: z.enum(["individual", "team", "department", "company"]).optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      isSystemTemplate: z.boolean().optional(),
      departmentId: objectIdSchema.nullable().optional(),
      scheduleConfig: z
        .object({
          required: z.boolean().optional(),
          dueTime: z.string().optional(),
          autoReminder: z.boolean().optional(),
          gracePeriodHours: z.number().int().min(0).optional(),
        })
        .optional(),
      scoringConfig: z
        .object({
          enabled: z.boolean().optional(),
          maxScore: z.number().min(1).optional(),
          calculationLogic: z.string().optional(),
        })
        .optional(),
      sections: z.array(sectionSchema).optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const listTemplatesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  }),
});

export const getTemplateSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const deleteTemplateSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const publishTemplateSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const cloneTemplateSchema = z.object({
  params: z.object({
    code: z.string().trim().min(1).max(100),
  }),
});

export const templateByDepartmentSchema = z.object({
  params: z.object({
    departmentId: objectIdSchema,
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR", "CUSTOM"]),
  }),
});

export const systemTemplateSchema = z.object({
  params: z.object({
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR", "CUSTOM"]),
  }),
});

export const assignDepartmentTemplateSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      departmentId: objectIdSchema,
      customTemplateEnabled: z.boolean().optional(),
      useAsCustomTemplate: z.boolean().optional(),
    })
    .strict(),
});
