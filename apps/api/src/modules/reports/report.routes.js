import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission, requireAnyPermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./report.controller.js";
import * as validation from "./report.validation.js";

export const createReportRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",
    requirePermission("report.submit"),
    validate(validation.createReportSchema),
    controller.createReport
  );
  router.get(
    "/",
    requireAnyPermission(["report.view_all", "report.submit"]),
    validate(validation.listReportsSchema),
    controller.listReports
  );
  router.get(
    "/:id",
    requireAnyPermission(["report.view_all", "report.submit"]),
    validate(validation.getReportSchema),
    controller.getReport
  );
  router.put(
    "/:id",
    requirePermission("report.submit"),
    validate(validation.updateReportSchema),
    controller.updateReport
  );
  router.post(
    "/:id/submit",
    requirePermission("report.submit"),
    validate(validation.submitReportSchema),
    controller.submitReport
  );
  router.post(
    "/:id/approve",
    requirePermission("report.approve"),
    validate(validation.approveReportSchema),
    controller.approveReport
  );
  router.post(
    "/:id/reject",
    requirePermission("report.reject"),
    validate(validation.rejectReportSchema),
    controller.rejectReport
  );

  return router;
};
