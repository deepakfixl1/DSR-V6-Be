import * as scheduleService from "./reportSchedule.service.js";
import { triggerScheduledRun } from "./reportRun.service.js";

/**
 * Create a new schedule
 */
export async function createSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.createSchedule({
      tenantId: req.tenantId,
      userId: req.user.id,
      data: req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a schedule
 */
export async function updateSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.updateSchedule({
      tenantId: req.tenantId,
      userId: req.user.id,
      scheduleId: req.validated.params.scheduleId,
      data: req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Pause a schedule
 */
export async function pauseSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.pauseSchedule({
      tenantId: req.tenantId,
      userId: req.user.id,
      scheduleId: req.params.scheduleId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resume a schedule
 */
export async function resumeSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.resumeSchedule({
      tenantId: req.tenantId,
      userId: req.user.id,
      scheduleId: req.params.scheduleId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(req, res, next) {
  try {
    await scheduleService.deleteSchedule({
      tenantId: req.tenantId,
      userId: req.user.id,
      scheduleId: req.params.scheduleId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      message: "Schedule deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List schedules
 */
export async function listSchedules(req, res, next) {
  try {
    const result = await scheduleService.listSchedules({
      tenantId: req.tenantId,
      ...req.validated.query
    });

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get upcoming schedules
 */
export async function getUpcomingSchedules(req, res, next) {
  try {
    const schedules = await scheduleService.getUpcomingSchedules({
      tenantId: req.tenantId,
      hours: req.validated.query.hours
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger a schedule run
 */
export async function runScheduleNow(req, res, next) {
  try {
    const run = await triggerScheduledRun({
      scheduleId: req.params.scheduleId,
      tenantId: req.tenantId
    });

    res.status(202).json({
      success: true,
      data: run,
      message: "Schedule run triggered"
    });
  } catch (error) {
    next(error);
  }
}
