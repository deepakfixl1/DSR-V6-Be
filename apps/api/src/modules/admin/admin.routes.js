/**
 * Admin routes. Platform metrics (admin only).
 */

import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { createSensitiveRateLimiter } from "#api/middlewares/rateLimit.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import { getMetricsSchema, tenantAdminSchema, breakGlassSchema } from "#api/modules/admin/admin.validation.js";
import * as adminController from "#api/modules/admin/admin.controller.js";

/**
 * @param {{ adminController: typeof adminController }} deps
 * @returns {import("express").Router}
 */
export const createAdminRoutes = ({ adminController }) => {
  const router = Router();

  router.use(authenticate(), requireAdmin());

  router.get("/metrics", validate(getMetricsSchema), adminController.getMetrics);
  router.get("/tenants", adminController.listTenants);
  router.post("/tenants/:id/suspend", validate(tenantAdminSchema), adminController.suspendTenant);
  router.post("/tenants/:id/unsuspend", validate(tenantAdminSchema), adminController.unsuspendTenant);
  router.post("/tenants/:id/impersonate", validate(tenantAdminSchema), adminController.impersonateTenant);
  router.get("/platform/stats", adminController.getPlatformStats);
  router.post("/break-glass", createSensitiveRateLimiter({ limit: 10 }), validate(breakGlassSchema), adminController.createBreakGlass);
  router.get("/break-glass/log", adminController.getBreakGlassLog);

  return router;
};
