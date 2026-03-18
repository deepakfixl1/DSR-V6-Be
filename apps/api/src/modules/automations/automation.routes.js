import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./automation.controller.js";
import * as validation from "./automation.validation.js";

export const createAutomationRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  // Stats must come before :id to avoid conflict
  router.get(
    "/stats",
    requirePermission("automation:view"),
    validate(validation.automationStatsSchema),
    controller.getStats
  );

  router.post(
    "/",
    requirePermission("automation:create"),
    validate(validation.createAutomationSchema),
    controller.createRule
  );

  router.get(
    "/",
    requirePermission("automation:view"),
    validate(validation.listAutomationsSchema),
    controller.listRules
  );

  router.get(
    "/:id",
    requirePermission("automation:view"),
    validate(validation.automationParamsSchema),
    controller.getRule
  );

  router.patch(
    "/:id",
    requirePermission("automation:update"),
    validate(validation.updateAutomationSchema),
    controller.updateRule
  );

  router.delete(
    "/:id",
    requirePermission("automation:delete"),
    validate(validation.automationParamsSchema),
    controller.deleteRule
  );

  router.patch(
    "/:id/toggle",
    requirePermission("automation:update"),
    validate(validation.toggleAutomationSchema),
    controller.toggleRule
  );

  router.post(
    "/:id/run",
    requirePermission("automation:execute"),
    validate(validation.runAutomationSchema),
    controller.runRule
  );

  router.get(
    "/:id/logs",
    requirePermission("automation:view"),
    validate(validation.listAutomationLogsSchema),
    controller.listLogs
  );

  return router;
};
