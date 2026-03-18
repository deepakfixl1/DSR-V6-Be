import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./weekCycle.controller.js";
import * as validation from "./weekCycle.validation.js";

export const createWeekCycleRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",

    // validate(validation.createWeekCycleSchema),
    controller.createWeekCycle
  );

  router.get(
    "/",

    // validate(validation.listWeekCyclesSchema),
    controller.listWeekCycles
  );

  router.get(
    "/:id",

    // validate(validation.getWeekCycleSchema),
    controller.getWeekCycle
  );

  router.put(
    "/:id",

    // validate(validation.updateWeekCycleSchema),
    controller.updateWeekCycle
  );

  router.delete(
    "/:id",

    // validate(validation.deleteWeekCycleSchema),
    controller.deleteWeekCycle
  );

  router.post(
    "/:id/submit",

    // validate(validation.submitWeekCycleSchema),
    controller.submitWeekCycle
  );

  router.post(
    "/:id/review",

    // validate(validation.reviewWeekCycleSchema),
    controller.reviewWeekCycle
  );

  router.post(
    "/:id/approve",

    // validate(validation.approveWeekCycleSchema),
    controller.approveWeekCycle
  );

  router.post(
    "/:id/reject",

    // validate(validation.rejectWeekCycleSchema),
    controller.rejectWeekCycle
  );

  router.post(
    "/:id/unlock",
    controller.unlockWeekCycle
  );

  return router;
};