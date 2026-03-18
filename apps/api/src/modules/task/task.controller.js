import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as taskService from "#api/modules/task/task.service.js";

export const createTask = asyncHandler(async (req, res) => {
  const { tenantId } = req.validated.params;
  const task = await taskService.createTask(tenantId, req.validated.body);
  return res.status(201).json(task);
});

export const updateTask = asyncHandler(async (req, res) => {
  const { tenantId, taskId } = req.validated.params;
  const task = await taskService.updateTask(tenantId, taskId, req.validated.body);
  return res.status(200).json(task);
});

export const listTasks = asyncHandler(async (req, res) => {
  const { tenantId } = req.validated.params;
  const result = await taskService.listTasks(tenantId, req.validated.query);
  return res.status(200).json(result);
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { tenantId, taskId } = req.validated.params;
  const task = await taskService.getTaskById(tenantId, taskId);
  return res.status(200).json(task);
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { tenantId, taskId } = req.validated.params;
  const result = await taskService.deleteTask(tenantId, taskId, req.membership._id);
  return res.status(200).json(result);
});
