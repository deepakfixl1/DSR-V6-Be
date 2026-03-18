import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import {
  signupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  logoutAllSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateTenantInviteSchema,
  acceptTenantInviteSchema,
  validateMemberInviteSchema,
  acceptMemberInviteSchema
} from "#api/modules/auth/auth.validation.js";
import * as authController from "#api/modules/auth/auth.controller.js";

/**
 * @param {{ authController: typeof authController }} deps
 * @returns {import("express").Router}
 */
export const createAuthRoutes = ({ authController }) => {
  const router = Router();

  router.post("/signup", validate(signupSchema), authController.signup);
  router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
  router.post("/resend-verification", validate(resendVerificationSchema), authController.resendVerification);
  router.post("/login", validate(loginSchema), authController.login);
  router.post("/refresh", validate(refreshSchema), authController.refresh);
  router.post("/logout", validate(logoutSchema), authController.logout);
  router.post("/logout-all", validate(logoutAllSchema), authController.logoutAll);
  router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
  router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
  router.get("/tenant-invite/validate", validate(validateTenantInviteSchema), authController.validateTenantInvite);
  router.post("/tenant-invite/accept", validate(acceptTenantInviteSchema), authController.acceptTenantInvite);
  router.get("/member-invite/validate", validate(validateMemberInviteSchema), authController.validateMemberInvite);
  router.post("/member-invite/accept", validate(acceptMemberInviteSchema), authController.acceptMemberInvite);

  return router;
};
