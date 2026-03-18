import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import { attachRbac } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./workReport.controller.js";
import * as validation from "./workReport.validation.js";
import { createLateSubmissionWorkReportRoutes } from "./lateSubmission.routes.js";

export const createWorkReportRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  // ── Late submission request (employee requests extension after deadline) ──
  router.use("/:id", createLateSubmissionWorkReportRoutes());

  // ── Routes that need department scope ─────────────────────
  router.post("/bulk-approve", attachRbac(), attachDepartmentScope(), validate(validation.bulkApproveWorkReportsSchema), controller.bulkApproveWorkReports);
  router.get("/my", validate(validation.listMyWorkReportsSchema), controller.listMyWorkReports);
  router.post("/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.createWorkReportSchema), controller.createWorkReport);
  router.get(
    "/:tenantId/template/:reportType",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.getReportTemplateSchema),
    controller.getReportTemplate
  );
  router.put("/:id", attachRbac(), attachDepartmentScope(), validate(validation.updateWorkReportSchema), controller.updateWorkReport);
  router.post("/:id/submit/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.submitWorkReportSchema), controller.submitWorkReport);

  router.post("/:id/approve/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.reviewWorkReportSchema), controller.approveWorkReport);
  router.post("/:id/reject/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.reviewWorkReportSchema), controller.rejectWorkReport);
  router.post("/:id/reopen/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.reopenWorkReportSchema), controller.reopenWorkReport);
  router.get("/:id/comments/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.workReportCommentsSchema), controller.listWorkReportComments);
  router.post("/:id/comments/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.addWorkReportCommentSchema), controller.addWorkReportComment);
  router.delete("/:id/:tenantId", attachRbac(), attachDepartmentScope(), validate(validation.deleteWorkReportSchema), controller.deleteWorkReport);

  router.get(
    "/",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.listWorkReportsSchema),
    controller.listWorkReports
  );

  router.get(
    "/:id",
    attachRbac(),
    attachDepartmentScope(),
    validate(validation.getWorkReportSchema),
    controller.getWorkReport
  );

  return router;
};
