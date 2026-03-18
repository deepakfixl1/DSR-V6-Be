import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import { attachRbac } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./workGoal.controller.js";
import * as validation from "./workGoal.validation.js";

export const createWorkGoalRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.createWorkGoalSchema),
    controller.createWorkGoal
  );

  router.get(
    "/",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.listWorkGoalsSchema),
    controller.listWorkGoals
  );

  // Named sub-routes BEFORE /:id to avoid id matching
  router.get("/week/current", attachRbac(), attachDepartmentScope(), controller.getCurrentWeekGoals);
  router.post("/carry-forward", attachRbac(), attachDepartmentScope(), validate(validation.carryForwardGoalsSchema), controller.carryForwardWorkGoals);
  router.get("/department/:deptId", attachRbac(), attachDepartmentScope(), validate(validation.goalsByDepartmentSchema), controller.listGoalsByDepartment);

  router.get(
    "/:id",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.getWorkGoalSchema),
    controller.getWorkGoal
  );

  router.get("/:id/history", attachRbac(), attachDepartmentScope(), validate(validation.goalHistorySchema), controller.getWorkGoalHistory);

  router.put(
    "/:id",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.updateWorkGoalSchema),
    controller.updateWorkGoal
  );

  router.patch("/:id/status", attachRbac(), attachDepartmentScope(), validate(validation.updateWorkGoalStatusSchema), controller.updateWorkGoalStatus);

  router.delete(
    "/:id",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.deleteWorkGoalSchema),
    controller.deleteWorkGoal
  );

  router.post(
    "/:id/submit",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.submitWorkGoalSchema),
    controller.submitWorkGoal
  );

  router.post(
    "/:id/approve",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.approveWorkGoalSchema),
    controller.approveWorkGoal
  );

  router.post(
    "/:id/reject",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.rejectWorkGoalSchema),
    controller.rejectWorkGoal
  );

  return router;
};
