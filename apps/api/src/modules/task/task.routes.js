import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { requireTaskAssigneeAccess, requireTaskEditAccess } from "#api/middlewares/taskAccess.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
  getTaskByIdSchema,
  deleteTaskSchema,
} from "#api/modules/task/task.validation.js";
import {
  createTaskTimeLogSchema,
  updateTaskTimeLogSchema,
  listTaskTimeLogsSchema,
  getTaskTimeLogByIdSchema,
  deleteTaskTimeLogSchema,
} from "#api/modules/taskTimeLog/taskTimeLog.validation.js";

/**
 * @param {{
 * taskController: import("#api/modules/task/task.controller.js"),
 * taskTimeLogController: import("#api/modules/taskTimeLog/taskTimeLog.controller.js")
 * }} deps
 * @returns {import("express").Router}
 */
export const createTaskRoutes = ({ taskController, taskTimeLogController }) => {
  const router = Router({ mergeParams: true });

  router.post("/tasks", validate(createTaskSchema), taskController.createTask);
  router.get("/tasks", validate(listTasksSchema), taskController.listTasks);
  router.get("/tasks/:taskId", validate(getTaskByIdSchema), taskController.getTaskById);
  router.patch(
    "/tasks/:taskId",
    validate(updateTaskSchema),
    requireTaskEditAccess(),
    taskController.updateTask
  );
  router.delete(
    "/tasks/:taskId",
    validate(deleteTaskSchema),
    requireTaskEditAccess(),
    taskController.deleteTask
  );

  router.post(
    "/tasks/:taskId/time-logs",
    validate(createTaskTimeLogSchema),
    requireTaskAssigneeAccess(),
    taskTimeLogController.createTaskTimeLog
  );

  router.get(
    "/tasks/:taskId/time-logs",
    validate(listTaskTimeLogsSchema),
    requireTaskAssigneeAccess(),
    taskTimeLogController.listTaskTimeLogs
  );

  router.get(
    "/time-logs/:timeLogId",
    validate(getTaskTimeLogByIdSchema),
    taskTimeLogController.getTaskTimeLogById
  );

  router.patch(
    "/time-logs/:timeLogId",
    validate(updateTaskTimeLogSchema),
    taskTimeLogController.updateTaskTimeLog
  );

  router.delete(
    "/time-logs/:timeLogId",
    validate(deleteTaskTimeLogSchema),
    taskTimeLogController.deleteTaskTimeLog
  );

  return router;
};
