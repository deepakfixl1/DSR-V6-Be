/**
 * Audit routes. Accessible to platform admins, tenant owners, tenant admins,
 * HR managers, and anyone with audit:read permission.
 */

import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { attachRbac } from "#api/modules/rbac/rbac.middleware.js";
import { requireAuditAccess } from "#api/middlewares/requireAuditAccess.middleware.js";
import { listAuditSchema, getAuditSchema } from "#api/modules/audit/audit.validation.js";
import * as auditController from "#api/modules/audit/audit.controller.js";

/**
 * @param {{ auditController: typeof auditController }} deps
 * @returns {import("express").Router}
 */
export const createAuditRoutes = ({ auditController }) => {
  const router = Router();

  router.use(authenticate(), resolveTenant(), attachRbac(), requireAuditAccess());

  router.get("/", validate(listAuditSchema), auditController.list);
  router.get("/:id", validate(getAuditSchema), auditController.getById);

  return router;
};
