/**
 * Membership validation schemas. Zod schemas for invite, accept, update, transfer.
 */

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Schema for GET /tenants/:tenantId/members (paginated list).
 */
export const listMembersSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    excludePlatformAdmins: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
  }),
});

/**
 * Schema for GET /tenants/:tenantId/members/me
 */
export const getMyTenantProfileSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

/**
 * Schema for POST /tenants/:tenantId/members/invite
 */
export const inviteMemberSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    roleId: objectIdSchema,
  }),
});

/**
 * Schema for POST /tenants/:tenantId/members/accept
 */
export const acceptInviteSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  body: z.object({
    token: z.string().min(1, "Invite token is required"),
  }),
});

/**
 * Schema for PATCH /tenants/:tenantId/members/:userId
 */
export const updateMembershipSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    userId: objectIdSchema,
  }),
  body: z
    .object({
      roleId: objectIdSchema.optional(),
      teamId: objectIdSchema.nullable().optional(),
      status: z.enum(["active", "disabled"]).optional(),
    })
    .strict(),
});

/**
 * Schema for DELETE /tenants/:tenantId/members/:userId
 */
export const removeMemberSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    userId: objectIdSchema,
  }),
});

/**
 * Schema for POST /tenants/:tenantId/members/:userId/transfer-ownership
 */
export const transferOwnershipSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    userId: objectIdSchema,
  }),
});

export const searchMembersSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
  query: z.object({
    search: z.string().optional(),
    departmentId: objectIdSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

export const getOrgChartSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
  }),
});

export const updateMemberDepartmentSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    userId: objectIdSchema,
  }),
  body: z.object({
    departmentId: objectIdSchema.nullable(),
  }).strict(),
});

export const getMemberActivitySchema = z.object({
  params: z.object({
    tenantId: objectIdSchema,
    userId: objectIdSchema,
  }),
});
