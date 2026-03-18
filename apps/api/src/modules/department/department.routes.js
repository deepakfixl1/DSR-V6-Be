import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsSchema,
  getDepartmentByIdSchema,
  deleteDepartmentSchema,
} from "#api/modules/department/department.validation.js";

/**
 * @param {{ departmentController: import("#api/modules/department/department.controller.js") }} deps
 * @returns {import("express").Router}
 */
export const createDepartmentRoutes = ({ departmentController }) => {
  const router = Router({ mergeParams: true });

  router.post(
    "/departments",
    validate(createDepartmentSchema),
    departmentController.createDepartment
  );

  router.get(
    "/departments",
    validate(listDepartmentsSchema),
    departmentController.listDepartments
  );

  router.get(
    "/departments/:departmentId",
    validate(getDepartmentByIdSchema),
    departmentController.getDepartmentById
  );

  router.patch(
    "/departments/:departmentId",
    validate(updateDepartmentSchema),
    departmentController.updateDepartment
  );

  router.delete(
    "/departments/:departmentId",
    validate(deleteDepartmentSchema),
    departmentController.deleteDepartment
  );

  return router;
};
