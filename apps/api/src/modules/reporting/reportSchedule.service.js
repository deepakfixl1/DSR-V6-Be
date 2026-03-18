import mongoose from "mongoose";
import { ReportSchedule, ReportTemplate } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { log as auditLog } from "#api/modules/audit/audit.service.js";
import { computeNextRunAt } from "./reportSchedule.utils.js";

/**
 * Create a new report schedule
 */
export async function createSchedule({ tenantId, userId, data, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(data.templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active"
  }).lean();

  if (!template) {
    throw ApiError.notFound("Template not found or inactive");
  }

  const nextRunAt = computeNextRunAt(data);

  const schedule = await ReportSchedule.create({
    ...data,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    templateId: new mongoose.Types.ObjectId(data.templateId),
    nextRunAt,
    createdBy: new mongoose.Types.ObjectId(userId)
  });

  await auditLog({
    action: "REPORT_SCHEDULE_CREATED",
    resourceType: "ReportSchedule",
    resourceId: schedule._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: { name: schedule.name, templateId: data.templateId, cadence: data.cadence }
  });

  logger.info({
    tenantId,
    userId,
    scheduleId: schedule._id,
    templateId: data.templateId,
    nextRunAt
  }, "Report schedule created");

  return schedule;
}

/**
 * Update an existing schedule
 */
export async function updateSchedule({ tenantId, userId, scheduleId, data, ip, userAgent }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!schedule) {
    throw ApiError.notFound("Schedule not found");
  }

  const oldData = schedule.toObject();

  Object.assign(schedule, data, {
    updatedBy: new mongoose.Types.ObjectId(userId)
  });

  if (data.cadence || data.cronExpr || data.timezone || data.runAt) {
    schedule.nextRunAt = computeNextRunAt(schedule.toObject());
  }

  await schedule.save();

  await auditLog({
    action: "REPORT_SCHEDULE_UPDATED",
    resourceType: "ReportSchedule",
    resourceId: schedule._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    diff: { before: oldData, after: schedule.toObject() },
    ip,
    userAgent,
    metadata: { name: schedule.name }
  });

  logger.info({
    tenantId,
    userId,
    scheduleId: schedule._id
  }, "Report schedule updated");

  return schedule;
}

/**
 * Pause a schedule
 */
export async function pauseSchedule({ tenantId, userId, scheduleId, ip, userAgent }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!schedule) {
    throw ApiError.notFound("Schedule not found");
  }

  schedule.status = "paused";
  schedule.updatedBy = new mongoose.Types.ObjectId(userId);
  await schedule.save();

  await auditLog({
    action: "REPORT_SCHEDULE_UPDATED",
    resourceType: "ReportSchedule",
    resourceId: schedule._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    diff: { before: { status: "active" }, after: { status: "paused" } },
    ip,
    userAgent,
    metadata: { name: schedule.name, action: "paused" }
  });

  logger.info({
    tenantId,
    userId,
    scheduleId: schedule._id
  }, "Report schedule paused");

  return schedule;
}

/**
 * Resume a schedule
 */
export async function resumeSchedule({ tenantId, userId, scheduleId, ip, userAgent }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!schedule) {
    throw ApiError.notFound("Schedule not found");
  }

  schedule.status = "active";
  schedule.updatedBy = new mongoose.Types.ObjectId(userId);
  schedule.nextRunAt = computeNextRunAt(schedule.toObject());
  await schedule.save();

  await auditLog({
    action: "REPORT_SCHEDULE_UPDATED",
    resourceType: "ReportSchedule",
    resourceId: schedule._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    diff: { before: { status: "paused" }, after: { status: "active" } },
    ip,
    userAgent,
    metadata: { name: schedule.name, action: "resumed" }
  });

  logger.info({
    tenantId,
    userId,
    scheduleId: schedule._id,
    nextRunAt: schedule.nextRunAt
  }, "Report schedule resumed");

  return schedule;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule({ tenantId, userId, scheduleId, ip, userAgent }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!schedule) {
    throw ApiError.notFound("Schedule not found");
  }

  await schedule.deleteOne();

  await auditLog({
    action: "REPORT_SCHEDULE_DELETED",
    resourceType: "ReportSchedule",
    resourceId: schedule._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: { name: schedule.name }
  });

  logger.info({
    tenantId,
    userId,
    scheduleId: schedule._id
  }, "Report schedule deleted");

  return { success: true };
}

/**
 * List schedules with pagination and filters
 */
export async function listSchedules({ tenantId, page = 1, limit = 20, templateId, status, cadence }) {
  const filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };

  if (templateId) filter.templateId = new mongoose.Types.ObjectId(templateId);
  if (status) filter.status = status;
  if (cadence) filter.cadence = cadence;

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ReportSchedule.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReportSchedule.countDocuments(filter)
  ]);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get schedule by ID
 */
export async function getScheduleById({ tenantId, scheduleId }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();

  if (!schedule) {
    throw ApiError.notFound("Schedule not found");
  }

  return schedule;
}

/**
 * Get upcoming schedules
 */
export async function getUpcomingSchedules({ tenantId, hours = 24 }) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const schedules = await ReportSchedule.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active",
    nextRunAt: { $gte: now, $lte: until }
  })
    .sort({ nextRunAt: 1 })
    .lean();

  return schedules;
}
