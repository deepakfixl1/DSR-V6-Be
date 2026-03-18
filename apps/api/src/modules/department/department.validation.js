import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const departmentTypeEnum = z.enum([
  "SALES",
  "IT",
  "HR",
  "FINANCE",
  "MARKETING",
  "OPERATIONS"
]);

const departmentStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

/**
 * CREATE
 */
export const createDepartmentSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  }),

  body: z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120),

    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .transform((v) => v.toLowerCase()),

    description: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),

    type: departmentTypeEnum,

    status: departmentStatusEnum.optional(),

    managerId: objectIdSchema.nullable().optional(),
    managerIds: z.array(objectIdSchema).optional(),
    departmentHeadId: objectIdSchema.nullable().optional(),

    templateId: objectIdSchema
      .nullable()
      .optional()
  }).strict()
});


/**
 * UPDATE
 */
export const updateDepartmentSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    departmentId: objectIdSchema
  }),

  body: z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),

    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .transform((v) => v.toLowerCase())
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),

    type: departmentTypeEnum.optional(),

    status: departmentStatusEnum.optional(),

    managerId: objectIdSchema.nullable().optional(),
    managerIds: z.array(objectIdSchema).optional(),
    departmentHeadId: objectIdSchema.nullable().optional(),

    templateId: objectIdSchema
      .nullable()
      .optional()
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided for update"
  })
});


/**
 * LIST
 */
export const listDepartmentsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    search: z.string().trim().optional(),

    type: departmentTypeEnum.optional(),

    status: departmentStatusEnum.optional()
  })
});


/**
 * GET BY ID
 */
export const getDepartmentByIdSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    departmentId: objectIdSchema
  })
});


/**
 * DELETE
 */
export const deleteDepartmentSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    departmentId: objectIdSchema
  })
});