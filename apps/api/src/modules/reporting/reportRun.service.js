import mongoose from "mongoose";
import { ReportTemplate, TenantMembership } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { log as auditLog } from "#api/modules/audit/audit.service.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
// import { enqueueReportJob } from "./reportQueue.service.js";

const MAX_CONCURRENT_RUNS_PER_TENANT = 10;
const MANUAL_RUN_RATE_LIMIT_PER_HOUR = 50;

/**
 * Trigger a manual report run
 */
export async function triggerManualRun({ tenantId, userId, templateId, data, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active"
  }).lean();

  if (!template) {
    throw ApiError.notFound("Template not found or inactive");
  }

  // Rate limit check
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRuns = await ReportRun.countDocuments({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    triggerType: "manual",
    createdAt: { $gte: oneHourAgo }
  });

  if (recentRuns >= MANUAL_RUN_RATE_LIMIT_PER_HOUR) {
    throw ApiError.badRequest("Manual run rate limit exceeded. Please try again later.");
  }

  // Concurrent runs check
  const runningCount = await ReportRun.countDocuments({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: { $in: ["queued", "running"] }
  });

  if (runningCount >= MAX_CONCURRENT_RUNS_PER_TENANT) {
    throw ApiError.badRequest("Too many concurrent report runs. Please wait for some to complete.");
  }

  const run = await ReportRun.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    templateId: new mongoose.Types.ObjectId(templateId),
    scheduleId: null,
    period: data.period,
    scopeSnapshot: data.scope || { type: "TENANT" },
    outputs: [],
    status: "queued",
    triggeredBy: new mongoose.Types.ObjectId(userId),
    triggerType: "manual"
  });

  await auditLog({
    action: "REPORT_RUN_TRIGGERED",
    resourceType: "ReportRun",
    resourceId: run._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: {
      templateId,
      triggerType: "manual",
      period: data.period
    }
  });

  // Enqueue job
  await enqueueReportJob({
    runId: String(run._id),
    tenantId,
    templateId,
    scheduleId: null,
    period: data.period,
    scope: data.scope || { type: "TENANT" },
    outputFormats: data.output?.formats || ["PDF"]
  });

  const membership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(userId),
    status: "active"
  }).lean();

  await createNotification({
    userId: new mongoose.Types.ObjectId(userId),
    memberId: membership?._id ? new mongoose.Types.ObjectId(membership._id) : null,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    scope: "user",
    type: "REPORT_RUN_QUEUED",
    title: "Report queued",
    body: `Report \"${template.name}\" has been queued.`,
    priority: "low",
    payload: { runId: String(run._id), status: "queued", templateName: template.name }
  });

  logger.info({
    tenantId,
    userId,
    runId: run._id,
    templateId
  }, "Manual report run triggered");

  return run;
}

/**
 * Trigger a scheduled report run
 */
export async function triggerScheduledRun({ scheduleId, tenantId }) {
  const schedule = await ReportSchedule.findOne({
    _id: new mongoose.Types.ObjectId(scheduleId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active"
  }).lean();

  if (!schedule) {
    throw ApiError.notFound("Schedule not found or inactive");
  }

  const template = await ReportTemplate.findOne({
    _id: schedule.templateId,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active"
  }).lean();

  if (!template) {
    throw ApiError.notFound("Template not found or inactive");
  }

  // Compute period based on cadence
  const period = computePeriodForSchedule(schedule);

  const run = await ReportRun.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    templateId: schedule.templateId,
    scheduleId: schedule._id,
    period,
    scopeSnapshot: schedule.scope || { type: "TENANT" },
    outputs: [],
    status: "queued",
    triggeredBy: null,
    triggerType: "schedule"
  });

  await auditLog({
    action: "REPORT_RUN_TRIGGERED",
    resourceType: "ReportRun",
    resourceId: run._id,
    userId: null,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    metadata: {
      templateId: String(schedule.templateId),
      scheduleId: String(schedule._id),
      triggerType: "schedule",
      period
    }
  });

  // Enqueue job
  await enqueueReportJob({
    runId: String(run._id),
    tenantId,
    templateId: String(schedule.templateId),
    scheduleId: String(schedule._id),
    period,
    scope: schedule.scope || { type: "TENANT" },
    outputFormats: schedule.output?.formats || ["PDF"]
  });

  await createNotification({
    userId: null,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    scope: "tenant",
    type: "REPORT_RUN_QUEUED",
    title: "Scheduled report queued",
    body: `Scheduled report \"${template.name}\" has been queued.`,
    priority: "low",
    payload: { runId: String(run._id), status: "queued", templateName: template.name }
  });

  logger.info({
    tenantId,
    runId: run._id,
    scheduleId,
    templateId: schedule.templateId
  }, "Scheduled report run triggered");

  return run;
}

/**
 * List report runs with pagination and filters
 */
export async function listRuns({ tenantId, page = 1, limit = 20, templateId, scheduleId, status, triggerType, fromDate, toDate }) {
  const filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };

  if (templateId) filter.templateId = new mongoose.Types.ObjectId(templateId);
  if (scheduleId) filter.scheduleId = new mongoose.Types.ObjectId(scheduleId);
  if (status) filter.status = status;
  if (triggerType) filter.triggerType = triggerType;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ReportRun.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReportRun.countDocuments(filter)
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
 * Get run by ID
 */
export async function getRunById({ tenantId, runId }) {
  const run = await ReportRun.findOne({
    _id: new mongoose.Types.ObjectId(runId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();

  if (!run) {
    throw ApiError.notFound("Report run not found");
  }

  return run;
}

/**
 * Retry a failed run
 */
export async function retryRun({ tenantId, userId, runId, ip, userAgent }) {
  const run = await ReportRun.findOne({
    _id: new mongoose.Types.ObjectId(runId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "failed"
  });

  if (!run) {
    throw ApiError.notFound("Failed run not found");
  }

  run.status = "queued";
  run.error = {};
  run.job.attempts = 0;
  await run.save();

  await auditLog({
    action: "REPORT_RUN_TRIGGERED",
    resourceType: "ReportRun",
    resourceId: run._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: {
      templateId: String(run.templateId),
      triggerType: "retry"
    }
  });

  // Re-enqueue job
  await enqueueReportJob({
    runId: String(run._id),
    tenantId,
    templateId: String(run.templateId),
    scheduleId: run.scheduleId ? String(run.scheduleId) : null,
    period: run.period,
    scope: run.scopeSnapshot,
    outputFormats: run.outputs.map(o => o.format)
  });

  logger.info({
    tenantId,
    userId,
    runId: run._id
  }, "Report run retried");

  return run;
}

/**
 * Delete a run
 */
export async function deleteRun({ tenantId, userId, runId, ip, userAgent }) {
  const run = await ReportRun.findOne({
    _id: new mongoose.Types.ObjectId(runId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!run) {
    throw ApiError.notFound("Report run not found");
  }

  if (run.status === "running") {
    throw ApiError.badRequest("Cannot delete a running report");
  }

  await run.deleteOne();

  await auditLog({
    action: "REPORT_RUN_DELETED",
    resourceType: "ReportRun",
    resourceId: run._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: {
      templateId: String(run.templateId),
      status: run.status
    }
  });

  logger.info({
    tenantId,
    userId,
    runId: run._id
  }, "Report run deleted");

  await createNotification({
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    scope: "user",
    type: "REPORT_RUN_CANCELLED",
    title: "Report run cancelled",
    body: `Report run ${run._id} was cancelled.`,
    priority: "high",
    payload: { runId: String(run._id), status: "cancelled" }
  });

  return { success: true };
}

/**
 * Get report stats
 */
export async function getReportStats({ tenantId }) {
  const [totalRuns, successRuns, failedRuns, runningRuns] = await Promise.all([
    ReportRun.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) }),
    ReportRun.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId), status: "success" }),
    ReportRun.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId), status: "failed" }),
    ReportRun.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ["queued", "running"] } })
  ]);

  return {
    totalRuns,
    successRuns,
    failedRuns,
    runningRuns,
    successRate: totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(2) : 0
  };
}

/**
 * Compute period for a schedule based on cadence
 */
function computePeriodForSchedule(schedule) {
  const now = new Date();
  const { cadence } = schedule;

  let from, to, label;

  switch (cadence) {
    case "DAILY":
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 1);
      to.setMilliseconds(-1);
      label = `Daily - ${from.toISOString().split("T")[0]}`;
      break;

    case "WEEKLY":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 7);
      to.setMilliseconds(-1);
      label = `Weekly - ${from.toISOString().split("T")[0]}`;
      break;

    case "MONTHLY":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = `Monthly - ${from.toISOString().split("T")[0]}`;
      break;

    case "QUARTERLY": {
      const quarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), quarter * 3 - 3, 1);
      to = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
      label = `Q${quarter} ${now.getFullYear()}`;
      break;
    }

    case "YEARLY":
      from = new Date(now.getFullYear() - 1, 0, 1);
      to = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      label = `Yearly - ${now.getFullYear() - 1}`;
      break;

    default:
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      to = new Date(now);
      label = "Custom";
  }

  return { from, to, label };
}
