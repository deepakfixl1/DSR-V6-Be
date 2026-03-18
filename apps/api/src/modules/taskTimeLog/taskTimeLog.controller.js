import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as taskTimeLogService from "#api/modules/taskTimeLog/taskTimeLog.service.js";

export const createTaskTimeLog = asyncHandler(async (req, res) => {
  const { tenantId, taskId } = req.validated.params;
  const timeLog = await taskTimeLogService.createTaskTimeLog(
    tenantId,
    taskId,
    req.membership._id,
    req.validated.body
  );
  return res.status(201).json(timeLog);
});

export const updateTaskTimeLog = asyncHandler(async (req, res) => {
  const { tenantId, timeLogId } = req.validated.params;
  const timeLog = await taskTimeLogService.updateTaskTimeLog(
    tenantId,
    timeLogId,
    req.membership._id,
    req.validated.body
  );
  return res.status(200).json(timeLog);
});

export const listTaskTimeLogs = asyncHandler(async (req, res) => {
  const { tenantId, taskId } = req.validated.params;
  const result = await taskTimeLogService.listTaskTimeLogs(
    tenantId,
    taskId,
    req.membership._id,
    req.validated.query
  );
  return res.status(200).json(result);
});

export const getTaskTimeLogById = asyncHandler(async (req, res) => {
  const { tenantId, timeLogId } = req.validated.params;
  const timeLog = await taskTimeLogService.getTaskTimeLogById(
    tenantId,
    timeLogId,
    req.membership._id
  );
  return res.status(200).json(timeLog);
});

export const deleteTaskTimeLog = asyncHandler(async (req, res) => {
  const { tenantId, timeLogId } = req.validated.params;
  const result = await taskTimeLogService.deleteTaskTimeLog(
    tenantId,
    timeLogId,
    req.membership._id
  );
  return res.status(200).json(result);
});
