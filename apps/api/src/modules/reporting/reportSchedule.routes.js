import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requirePermission } from "#api/middlewares/requirePermission.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import * as controller from "./reportSchedule.controller.js";
import * as validation from "./reportSchedule.validation.js";

const router = Router();

// All routes require authentication and tenantId
router.use(authenticate());

// GET /api/reports/schedules/upcoming
router.get(
  "/upcoming",
  requirePermission("report.view_all"),
  validate(validation.upcomingSchedulesSchema),
  controller.getUpcomingSchedules
);

// POST /api/reports/schedules
router.post(
  "/",
  requirePermission("template.create"),
  validate(validation.createScheduleSchema),
  controller.createSchedule
);

// PUT /api/reports/schedules/:scheduleId
router.put(
  "/:scheduleId",
  requirePermission("template.edit"),
  validate(validation.updateScheduleSchema),
  controller.updateSchedule
);

// PATCH /api/reports/schedules/:scheduleId/pause
router.patch(
  "/:scheduleId/pause",
  requirePermission("template.edit"),
  controller.pauseSchedule
);

// PATCH /api/reports/schedules/:scheduleId/resume
router.patch(
  "/:scheduleId/resume",
  requirePermission("template.edit"),
  controller.resumeSchedule
);

// DELETE /api/reports/schedules/:scheduleId
router.delete(
  "/:scheduleId",
  requirePermission("template.delete"),
  controller.deleteSchedule
);

// GET /api/reports/schedules
router.get(
  "/",
  requirePermission("report.view_all"),
  validate(validation.listSchedulesSchema),
  controller.listSchedules
);

// POST /api/reports/schedules/:scheduleId/run
router.post(
  "/:scheduleId/run",
  requirePermission("report.submit"),
  controller.runScheduleNow
);

export default router;
