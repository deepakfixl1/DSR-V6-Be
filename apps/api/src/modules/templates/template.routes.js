import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requirePermission } from "#api/modules/rbac/rbac.middleware.js";
import * as controller from "./template.controller.js";
import * as validation from "./template.validation.js";

export const createTemplateRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.post(
    "/",
 
    // validate(validation.createTemplateSchema),
    controller.createTemplate
  );

  router.get(
    "/",
    // requirePermission("template.view"),
    // validate(validation.listTemplatesSchema),
    controller.listTemplates
  );

  router.get(
    "/default",
    // requirePermission("template.view"),
    // validate(validation.getDefaultTemplateSchema),
    controller.getDefaultTemplate
  );

  router.get(
    "/by-department/:departmentId/:reportType",
    // requirePermission("template.view"),
    // validate(validation.resolveTemplateForDepartmentSchema),
    controller.resolveTemplateForDepartment
  );

  router.get(
    "/:id",
    // requirePermission("template.view"),
    // validate(validation.getTemplateSchema),
    controller.getTemplate
  );

  router.put(
    "/:id",
    // requirePermission("template.edit"),
    // validate(validation.updateTemplateSchema),
    controller.updateTemplate
  );

  router.post(
    "/:id/disable",
    // requirePermission("template.edit"),
    // validate(validation.templateIdSchema),
    controller.disableTemplate
  );

  router.post(
    "/:id/enable",
    // requirePermission("template.edit"),
    // validate(validation.templateIdSchema),
    controller.enableTemplate
  );

  router.post(
    "/:id/archive",
    // requirePermission("template.delete"),
    // validate(validation.templateIdSchema),
    controller.archiveTemplate
  );

  router.post(
    "/:id/restore",
    // requirePermission("template.edit"),
    // validate(validation.templateIdSchema),
    controller.restoreArchivedTemplate
  );

  router.post(
    "/:id/clone",
    // requirePermission("template.create"),
    // validate(validation.cloneTemplateSchema),
    controller.cloneTemplate
  );

  router.post(
    "/:id/set-default",
    // requirePermission("template.edit"),
    // validate(validation.templateIdSchema),
    controller.setDefaultTemplate
  );

  return router;
};

export const createSystemTemplateRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.get(
    "/",
    // requirePermission("template.system.view"),
    // validate(validation.listSystemTemplatesSchema),
    controller.listSystemTemplates
  );

  router.post(
    "/",
    // requirePermission("template.system.create"),
    // validate(validation.createSystemTemplateSchema),
    controller.createSystemTemplate
  );

  router.put(
    "/:id",
    // requirePermission("template.system.edit"),
    // validate(validation.updateSystemTemplateSchema),
    controller.updateSystemTemplate
  );

  router.delete(
    "/:id",
    // requirePermission("template.system.delete"),
    // validate(validation.templateIdSchema),
    controller.deleteSystemTemplate
  );

  return router;
};