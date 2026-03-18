/**
 * Tenant routes. Create/get/update/suspend tenant and settings; membership nested under :tenantId.
 */

import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import {
  createTenantSchema,
  getTenantSchema,
  updateTenantSchema,
  deleteTenantSchema,
  getSettingsSchema,
  updateSettingsSchema,
  reinviteTenantSchema,
  settingsSectionSchema,
  updateGeneralSettingsSchema,
  updateReportConfigSchema,
  updateAiConfigSchema,
  updateLateSubmissionLockSchema,
} from "#api/modules/tenant/tenant.validation.js";
import {
  requireTenantMembership,
  requireTenantOwner,
} from "#api/middlewares/requireTenantMembership.js";
import { requireTenantNotReadOnly } from "#api/middlewares/requireTenantNotReadOnly.js";
import { createMembershipRoutes } from "#api/modules/membership/membership.routes.js";
import { createDepartmentRoutes } from "#api/modules/department/department.routes.js";
import { createTaskRoutes } from "#api/modules/task/task.routes.js";
import * as tenantController from "#api/modules/tenant/tenant.controller.js";

/**
 * @param {{
 * tenantController: typeof tenantController,
 * membershipController: import("#api/modules/membership/membership.controller.js"),
 * departmentController: import("#api/modules/department/department.controller.js"),
 * taskController: import("#api/modules/task/task.controller.js"),
 * taskTimeLogController: import("#api/modules/taskTimeLog/taskTimeLog.controller.js")
 * }} deps
 * @returns {import("express").Router}
 */
export const createTenantRoutes = ({
  tenantController,
  membershipController,
  departmentController,
  taskController,
  taskTimeLogController,
}) => {
  const router = Router();

  router.use(authenticate());

  router.post("/", requireAdmin(), validate(createTenantSchema), tenantController.createTenant);

  router.post(
    "/invites/:inviteId/reinvite",
    requireAdmin(),
    validate(reinviteTenantSchema),
    tenantController.reinviteTenantInvite
  );

  router.get(
    "/:tenantId",
    validate(getTenantSchema),
    requireTenantMembership(),
    tenantController.getTenant
  );
  router.get(
    "/",
    tenantController.getMyTenants
  )

  router.patch(
    "/:tenantId",
    validate(updateTenantSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    tenantController.updateTenant
  );

  router.delete(
    "/:tenantId",
    validate(deleteTenantSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    tenantController.deleteTenant
  );

  router.get(
    "/:tenantId/features",
    validate(getTenantSchema),
    requireTenantMembership(),
    tenantController.getFeatures
  );

  router.get(
    "/:tenantId/settings",
    validate(getSettingsSchema),
    requireTenantMembership(),
    tenantController.getSettings
  );

  router.patch(
    "/:tenantId/settings",
    validate(updateSettingsSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    tenantController.updateSettings
  );

  router.get("/:tenantId/settings/general", validate(settingsSectionSchema), requireTenantMembership(), tenantController.getGeneralSettings);
  router.patch("/:tenantId/settings/report-config", validate(updateReportConfigSchema), requireTenantMembership(), requireTenantOwner(), tenantController.updateReportConfig);
  router.patch("/:tenantId/settings/ai-config", validate(updateAiConfigSchema), requireTenantMembership(), requireTenantOwner(), tenantController.updateAiConfig);
  router.get("/:tenantId/settings/notification-config", validate(settingsSectionSchema), requireTenantMembership(), tenantController.getNotificationConfig);
  router.patch("/:tenantId/settings/late-submission-lock", validate(updateLateSubmissionLockSchema), requireTenantMembership(), requireTenantOwner(), tenantController.updateLateSubmissionLock);

  router.use(
    "/:tenantId",
    requireTenantMembership(),
    requireTenantNotReadOnly(),
    createMembershipRoutes({ membershipController })
  );
  router.use(
    "/:tenantId",
    requireTenantMembership(),
    requireTenantNotReadOnly(),
    createDepartmentRoutes({ departmentController })
  );
  router.use(
    "/:tenantId",
    requireTenantMembership(),
    requireTenantNotReadOnly(),
    createTaskRoutes({ taskController, taskTimeLogController })
  );

  return router;
};
