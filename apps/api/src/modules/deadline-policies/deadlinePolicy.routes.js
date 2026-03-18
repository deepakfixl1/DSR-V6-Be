import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./deadlinePolicy.controller.js";
import * as validation from "./deadlinePolicy.validation.js";

export const createDeadlinePolicyRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.get(
    "/",
    requirePermission("automation:view"),
    validate(validation.listPoliciesSchema),
    controller.listPolicies
  );

  router.post(
    "/",
    requirePermission("automation:create"),
    validate(validation.createPolicySchema),
    controller.createPolicy
  );

  router.get(
    "/:id",
    requirePermission("automation:view"),
    validate(validation.policyParamsSchema),
    controller.getPolicy
  );

  router.patch(
    "/:id",
    requirePermission("automation:update"),
    validate(validation.updatePolicySchema),
    controller.updatePolicy
  );

  router.delete(
    "/:id",
    requirePermission("automation:delete"),
    validate(validation.policyParamsSchema),
    controller.deletePolicy
  );

  router.patch(
    "/:id/toggle",
    requirePermission("automation:update"),
    validate(validation.togglePolicySchema),
    controller.togglePolicy
  );

  return router;
};
