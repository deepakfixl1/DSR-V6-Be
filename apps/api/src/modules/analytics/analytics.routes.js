import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { attachRbac } from "#api/modules/rbac/rbac.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import * as controller from "./analytics.controller.js";
import * as validation from "./analytics.validation.js";

export const createAnalyticsRoutes = () => {
  const router = Router();
  router.use(authenticate());

  router.get("/employee/:memberId/scorecard", attachRbac(), attachDepartmentScope(), validate(validation.employeeScorecardSchema), controller.getEmployeeScorecard);
  router.get("/team/:managerId", attachRbac(), attachDepartmentScope(), validate(validation.teamAnalyticsSchema), controller.getTeamAnalytics);
  router.get("/department/:deptId", attachRbac(), attachDepartmentScope(), validate(validation.departmentAnalyticsSchema), controller.getDepartmentAnalytics);
  router.get("/scoring/report/:id", attachRbac(), attachDepartmentScope(), validate(validation.reportScoringSchema), controller.getReportScore);
  router.get("/scoring/employee/:memberId", attachRbac(), attachDepartmentScope(), validate(validation.employeeScoringSchema), controller.getEmployeeScoring);
  router.get("/late-submissions", attachRbac(), attachDepartmentScope(), validate(validation.trendsSchema), controller.getLateSubmissions);
  router.get("/trends/weekly", attachRbac(), attachDepartmentScope(), validate(validation.trendsSchema), controller.getWeeklyTrends);

  return router;
};
