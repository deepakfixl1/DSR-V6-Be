import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requireAnyPermission, requirePermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./goalAnalysis.controller.js";
import * as validation from "./goalAnalysis.validation.js";

export const createGoalAnalysisRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.get(
    "/dsr-suggestions",
    requireAnyPermission(["work_report.submit", "work_report.view_all", "work_report.approve"]),
    validate(validation.dsrSuggestionSchema),
    controller.getDSRSuggestions
  );

  router.get(
    "/work-reports/:reportId",
    requirePermission("work_report.approve"),
    validate(validation.reportAnalysisSchema),
    controller.analyzeReportGoals
  );

  router.get(
    "/period",
    requireAnyPermission(["work_report.approve", "work_report.view_all"]),
    validate(validation.periodAnalysisSchema),
    controller.getPeriodGoalAnalysis
  );

  return router;
};
