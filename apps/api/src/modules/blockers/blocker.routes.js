import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission, requireAnyPermission } from "#api/modules/rbac/rbac.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import * as controller from "./blocker.controller.js";
import * as validation from "./blocker.validation.js";

export const createBlockerRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",
    requirePermission("blocker.create"),
    attachDepartmentScope(),
    validate(validation.createBlockerSchema),
    controller.createBlocker
  );
  router.get(
    "/",
    requireAnyPermission(["blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve"]),
    attachDepartmentScope(),
    validate(validation.listBlockersSchema),
    controller.listBlockers
  );
  router.get(
    "/stats",
    requireAnyPermission(["blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve"]),
    attachDepartmentScope(),
    validate(validation.blockerStatsSchema),
    controller.getBlockerStats
  );
  router.get(
    "/sla-breached",
    requireAnyPermission(["blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve"]),
    attachDepartmentScope(),
    validate(validation.slaBreachedBlockersSchema),
    controller.listSlaBreachedBlockers
  );
  router.get(
    "/:id",
    requireAnyPermission(["blocker.create", "blocker.assign", "blocker.escalate", "blocker.resolve"]),
    attachDepartmentScope(),
    validate(validation.getBlockerSchema),
    controller.getBlocker
  );
  router.patch(
    "/:id",
    requirePermission("blocker.assign"),
    attachDepartmentScope(),
    validate(validation.updateBlockerSchema),
    controller.updateBlocker
  );
  router.patch(
    "/:id/escalate",
    requirePermission("blocker.escalate"),
    attachDepartmentScope(),
    validate(validation.escalateBlockerSchema),
    controller.escalateBlocker
  );
  router.patch(
    "/:id/resolve",
    requirePermission("blocker.resolve"),
    attachDepartmentScope(),
    validate(validation.resolveBlockerSchema),
    controller.resolveBlocker
  );
  router.patch(
    "/:id/close",
    requirePermission("blocker.resolve"),
    attachDepartmentScope(),
    validate(validation.closeBlockerSchema),
    controller.closeBlocker
  );
  router.delete(
    "/:id",
    requirePermission("blocker.assign"),
    attachDepartmentScope(),
    validate(validation.deleteBlockerSchema),
    controller.deleteBlocker
  );

  return router;
};
