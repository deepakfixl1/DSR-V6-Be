import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as departmentService from "#api/modules/department/department.service.js";

export const createDepartment = asyncHandler(async (req, res) => {
  const { tenantId } = req.validated.params;

  const department = await departmentService.createDepartment({
    tenantId,
    input: req.validated.body,
    actorMemberId: req.membership._id
  });

  res.status(201).json(department);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const { tenantId, departmentId } = req.validated.params;

  const department = await departmentService.updateDepartment({
    tenantId,
    departmentId,
    input: req.validated.body,
    actorMemberId: req.membership._id
  });

  res.status(200).json(department);
});

export const listDepartments = asyncHandler(async (req, res) => {
  const { tenantId } = req.validated.params;

  const result = await departmentService.listDepartments({
    tenantId,
    query: req.validated.query
  });

  res.status(200).json(result);
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const { tenantId, departmentId } = req.validated.params;

  const department = await departmentService.getDepartmentById({
    tenantId,
    departmentId
  });

  res.status(200).json(department);
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const { tenantId, departmentId } = req.validated.params;

  const result = await departmentService.deleteDepartment({
    tenantId,
    departmentId,
    actorMemberId: req.membership._id
  });

  res.status(200).json(result);
});