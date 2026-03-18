import * as userService from "#api/modules/user/user.service.js";

/**
 * GET /users/me - current user profile.
 */
export async function getMe(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await userService.getMe(userId);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /users/me - update profile.
 */
export async function updateMe(req, res, next) {
  try {
    const userId = req.user.id;
    const { body } = req.validated;
    const user = await userService.updateMe(userId, body);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/change-password - change password and revoke other sessions.
 */
export async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { body } = req.validated;
    const result = await userService.changePassword(userId, body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /users/sessions - list active sessions.
 */
export async function getSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const sessions = await userService.getSessions(userId);
    return res.status(200).json({ sessions });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /users/sessions/:tokenId - revoke one session.
 */
export async function revokeSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { tokenId } = req.validated.params;
    await userService.revokeSession(userId, tokenId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /users - list platform users (admin only).
 */
export async function listUsers(req, res, next) {
  try {
    const query = req.validated?.query ?? {};
    const result = await userService.listUsers(query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /users/:id - get user by id (admin only).
 */
export async function getUserById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /users/:id - update user (admin only).
 */
export async function updateUserByAdmin(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { body } = req.validated;
    const user = await userService.updateUserByAdmin(id, body);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/:id/disable - disable user (admin only).
 */
export async function disableUser(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await userService.disableUser(id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/:id/unlock - unlock user (admin only).
 */
export async function unlockUser(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await userService.unlockUser(id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/invite - invite platform admin (admin only).
 */
export async function invitePlatformUser(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await userService.invitePlatformUser(body, req.user.id);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/:id/reinvite - resend platform invite (admin only).
 */
export async function reinvitePlatformUser(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await userService.reinvitePlatformUser(id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /users/:id/cancel-invite - cancel platform invite (admin only).
 */
export async function cancelPlatformInvite(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await userService.cancelPlatformInvite(id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /users/:id - delete user (admin only).
 */
export async function deleteUserByAdmin(req, res, next) {
  try {
    const { id } = req.validated.params;
    await userService.deleteUserByAdmin(id, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
