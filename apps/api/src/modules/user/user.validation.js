import { z } from "zod";

const passwordSchema = z.string().min(8).max(128);

/** GET /users/me - no body */
export const getMeSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional()
});

/** PATCH /users/me */
export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(120).trim().optional(),
      avatarUrl: z.string().url().max(2048).nullable().optional()
    })
    .strict(),
  params: z.object({}).optional()
});

/** POST /users/change-password */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema
  }),
  params: z.object({}).optional()
});

/** GET /users/sessions */
export const getSessionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional()
});

/** DELETE /users/sessions/:tokenId */
export const revokeSessionSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    tokenId: z.string().min(1).max(128)
  })
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

/** GET /users - list platform users (admin only) */
export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z.enum(["active", "disabled", "locked", "invited"]).optional(),
      search: z.string().max(200).optional(),
      platformRoleId: objectIdSchema.optional(),
      sort: z.string().max(50).optional()
    })
    .optional()
});

/** GET /users/:id - get user by id (admin only) */
export const getUserByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});

/** PATCH /users/:id - update user (admin only) */
export const updateUserSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      name: z.string().min(1).max(120).trim().optional(),
      avatarUrl: z.string().url().max(2048).nullable().optional(),
      status: z.enum(["active", "disabled", "locked"]).optional(),
      platformRoleId: objectIdSchema.nullable().optional()
    })
    .strict()
});

/** POST /users/:id/disable - disable user (admin only) */
export const disableUserSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});

/** POST /users/:id/unlock - unlock user (admin only) */
export const unlockUserSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});

/** POST /users/invite - invite platform admin (admin only) */
export const invitePlatformUserSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    name: z.string().min(1).max(120).trim(),
    platformRoleId: objectIdSchema
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

/** POST /users/:id/reinvite - reinvite platform admin (admin only) */
export const reinvitePlatformUserSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});

/** POST /users/:id/cancel-invite - cancel platform invite (admin only) */
export const cancelPlatformInviteSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});

/** DELETE /users/:id - delete user (admin only) */
export const deleteUserSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectIdSchema })
});
