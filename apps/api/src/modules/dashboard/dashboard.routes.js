import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { attachRbac } from "#api/modules/rbac/rbac.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import * as controller from "./dashboard.controller.js";
import { dashboardSchema } from "./dashboard.validation.js";

export const createDashboardRoutes = () => {
  const router = Router();
  router.use(authenticate());

  router.get("/stats", attachRbac(), attachDepartmentScope(), validate(dashboardSchema), controller.getStats);
  router.get("/team-stats", attachRbac(), attachDepartmentScope(), validate(dashboardSchema), controller.getTeamStats);
  router.get("/activity-feed", attachRbac(), attachDepartmentScope(), validate(dashboardSchema), controller.getActivityFeed);

  return router;
};
