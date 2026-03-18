/**
 * Roles routes. Read-only list for invite/assign UI.
 */

import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import * as rolesController from "#api/modules/roles/roles.controller.js";

export const createRolesRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.get("/", rolesController.listRoles);
  router.get("/:id", requireAdmin(), rolesController.getRoleById);

  return router;
};
