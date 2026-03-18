import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission, requireAnyPermission } from "#api/modules/rbac/rbac.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import * as controller from "./goal.controller.js";
import * as validation from "./goal.validation.js";

export const createGoalRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",
    requirePermission("goal.create"),
    attachDepartmentScope(),
    validate(validation.createGoalSchema),
    controller.createGoal
  );
  router.get(
    "/",
    requireAnyPermission(["goal.create", "goal.edit", "goal.assign", "goal.delete"]),
    attachDepartmentScope(),
    validate(validation.listGoalsSchema),
    controller.listGoals
  );
  router.get(
    "/:id",
    requireAnyPermission(["goal.create", "goal.edit", "goal.assign", "goal.delete"]),
    attachDepartmentScope(),
    validate(validation.getGoalSchema),
    controller.getGoal
  );
  router.put(
    "/:id",
    requirePermission("goal.edit"),
    attachDepartmentScope(),
    validate(validation.updateGoalSchema),
    controller.updateGoal
  );
  router.delete(
    "/:id",
    requirePermission("goal.delete"),
    attachDepartmentScope(),
    validate(validation.deleteGoalSchema),
    controller.deleteGoal
  );
  router.patch(
    "/:id/key-results/:krIndex",
    requirePermission("goal.edit"),
    attachDepartmentScope(),
    validate(validation.updateKeyResultSchema),
    controller.updateKeyResult
  );

  return router;
};
