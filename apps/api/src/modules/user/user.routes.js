import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import {
  getMeSchema,
  updateMeSchema,
  changePasswordSchema,
  getSessionsSchema,
  revokeSessionSchema,
  listUsersSchema,
  getUserByIdSchema,
  updateUserSchema,
  disableUserSchema,
  unlockUserSchema,
  invitePlatformUserSchema,
  reinvitePlatformUserSchema,
  cancelPlatformInviteSchema,
  deleteUserSchema
} from "#api/modules/user/user.validation.js";
import * as userController from "#api/modules/user/user.controller.js";

/**
 * @param {{ userController: typeof userController }} deps
 * @returns {import("express").Router}
 */
export const createUserRoutes = ({ userController }) => {
  const router = Router();

  router.use(authenticate());

  router.get("/me", validate(getMeSchema), userController.getMe);
  router.patch("/me", validate(updateMeSchema), userController.updateMe);
  router.post("/change-password", validate(changePasswordSchema), userController.changePassword);
  router.get("/sessions", validate(getSessionsSchema), userController.getSessions);
  router.delete("/sessions/:tokenId", validate(revokeSessionSchema), userController.revokeSession);

  router.get("/", requireAdmin(), validate(listUsersSchema), userController.listUsers);
  router.post("/invite", requireAdmin(), validate(invitePlatformUserSchema), userController.invitePlatformUser);
  router.post("/:id/reinvite", requireAdmin(), validate(reinvitePlatformUserSchema), userController.reinvitePlatformUser);
  router.post("/:id/cancel-invite", requireAdmin(), validate(cancelPlatformInviteSchema), userController.cancelPlatformInvite);
  router.get("/:id", requireAdmin(), validate(getUserByIdSchema), userController.getUserById);
  router.patch("/:id", requireAdmin(), validate(updateUserSchema), userController.updateUserByAdmin);
  router.post("/:id/disable", requireAdmin(), validate(disableUserSchema), userController.disableUser);
  router.post("/:id/unlock", requireAdmin(), validate(unlockUserSchema), userController.unlockUser);
  router.delete("/:id", requireAdmin(), validate(deleteUserSchema), userController.deleteUserByAdmin);

  return router;
};
