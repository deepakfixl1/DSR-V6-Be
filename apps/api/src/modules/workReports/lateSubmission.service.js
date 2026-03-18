/**
 * Late Submission Request service.
 * Handles employee requests to submit reports after deadline + manager approval/rejection.
 */

import mongoose from "mongoose";
import {
  LateSubmissionRequest,
  WorkReport,
  TenantMembership,
  User,
  ReportPenaltyPolicy,
  ReportPenaltyLog
} from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
import {
  enqueueLateSubmissionRequestEmail,
  enqueueLateSubmissionApprovedEmail,
  enqueueLateSubmissionRejectedEmail
} from "#infra/queue/email.queue.js";
import { logger } from "#api/utils/logger.js";
import { config } from "#api/config/env.js";

const toObjectId = (v) => new mongoose.Types.ObjectId(String(v));

function buildWorkReportLink(reportId) {
  const base = config.app.frontendUrl || "http://localhost:5175";
  return `${base}/work-reports/${reportId}`;
}

function buildManagerDashboardLink() {
  const base = config.app.frontendUrl || "http://localhost:5175";
  return `${base}/late-submission-requests`;
}

// ── Employee: Request Extension ────────────────────────────────────────────

/**
 * Employee requests to submit a report after its deadline.
 * Creates a LateSubmissionRequest linked to the WorkReport.
 * @param {{ tenantId, workReportId, requestedByUserId, requestedByMemberId, reason }} params
 */
export async function requestLateSubmission({
  tenantId,
  workReportId,
  requestedByUserId,
  requestedByMemberId,
  reason
}) {
  const report = await WorkReport.findOne({
    _id: toObjectId(workReportId),
    tenantId: toObjectId(tenantId)
  }).lean();

  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status !== "DRAFT") {
    throw ApiError.conflict("Cannot request extension for a report that is already submitted");
  }
  if (!report.submissionDeadline) {
    throw ApiError.badRequest("This report has no submission deadline set");
  }

  const now = new Date();
  if (new Date(report.submissionDeadline) > now) {
    throw ApiError.badRequest("Report deadline has not passed yet");
  }

  // Check if policy allows late submission requests
  const policy = await ReportPenaltyPolicy.findOne({
    tenantId: toObjectId(tenantId),
    reportType: report.reportType,
    status: "active"
  }).lean();

  if (policy && !policy.allowLateSubmissionRequest) {
    throw ApiError.forbidden(
      "Late submission requests are not allowed for this report type per the current policy"
    );
  }

  // Check for existing pending request
  const existing = await LateSubmissionRequest.findOne({
    workReportId: toObjectId(workReportId),
    tenantId: toObjectId(tenantId),
    status: "pending"
  }).lean();

  if (existing) {
    throw ApiError.conflict("A pending late submission request already exists for this report");
  }

  // Resolve manager from department
  const membership = await TenantMembership.findById(toObjectId(requestedByMemberId))
    .select("departmentId managerId userId")
    .lean();

  const managerId = membership?.managerId || null;
  const departmentId = report.departmentId || membership?.departmentId || null;

  const lsr = await LateSubmissionRequest.create({
    tenantId: toObjectId(tenantId),
    workReportId: toObjectId(workReportId),
    requestedBy: toObjectId(requestedByUserId),
    requestedByMemberId: toObjectId(requestedByMemberId),
    managerId: managerId ? toObjectId(managerId) : null,
    departmentId: departmentId ? toObjectId(departmentId) : null,
    reportType: report.reportType,
    reason
  });

  // Notify manager
  if (managerId) {
    const [employee, manager] = await Promise.all([
      User.findById(requestedByUserId).select("name email").lean(),
      User.findById(managerId).select("name email").lean()
    ]);

    if (manager) {
      const approveLink = buildManagerDashboardLink();
      const rejectLink = buildManagerDashboardLink();

      await createNotification({
        userId: toObjectId(managerId),
        tenantId: toObjectId(tenantId),
        scope: "user",
        type: "LATE_SUBMISSION_REQUEST",
        title: `Late Submission Request from ${employee?.name || "Employee"}`,
        body: `${employee?.name || "An employee"} wants to submit their ${report.reportType} report after deadline.`,
        link: approveLink,
        priority: "high",
        payload: { lsrId: String(lsr._id), workReportId: String(workReportId), reportType: report.reportType }
      }).catch((err) => logger.warn({ err }, "Failed to create LSR notification for manager"));

      if (manager.email) {
        await enqueueLateSubmissionRequestEmail({
          to: manager.email,
          managerName: manager.name,
          employeeName: employee?.name || "Employee",
          reportType: report.reportType,
          reason,
          approveLink,
          rejectLink
        }).catch((err) => logger.warn({ err }, "Failed to enqueue LSR email"));
      }
    }
  }

  logger.info({ lsrId: lsr._id, workReportId, tenantId }, "Late submission request created");
  return lsr;
}

// ── Manager: List Pending Requests ─────────────────────────────────────────

/**
 * Lists late submission requests.
 * Managers see requests for their reportees; admins/owners see all.
 */
export async function listLateSubmissionRequests({
  tenantId,
  managerId = null,
  status = null,
  page = 1,
  limit = 20
}) {
  const filter = { tenantId: toObjectId(tenantId) };
  if (managerId) filter.managerId = toObjectId(managerId);
  if (status) filter.status = status;

  const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100));
  const actualLimit = Math.max(1, Math.min(limit, 100));

  const [docs, total] = await Promise.all([
    LateSubmissionRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .populate("requestedBy", "name email")
      .populate("workReportId", "reportType period submissionDeadline")
      .lean(),
    LateSubmissionRequest.countDocuments(filter)
  ]);

  return { docs, total, page: Math.max(1, page), limit: actualLimit, pages: Math.ceil(total / actualLimit) };
}

// ── Manager: Approve ───────────────────────────────────────────────────────

/**
 * Manager approves a late submission request; sets extendedDeadline on WorkReport.
 * @param {{ tenantId, lsrId, respondedByUserId, extendedDeadline, managerNotes? }} params
 */
export async function approveLateSubmission({
  tenantId,
  lsrId,
  respondedByUserId,
  extendedDeadline,
  managerNotes
}) {
  const lsr = await LateSubmissionRequest.findOne({
    _id: toObjectId(lsrId),
    tenantId: toObjectId(tenantId),
    status: "pending"
  });

  if (!lsr) throw ApiError.notFound("Late submission request not found or already resolved");

  const policy = await ReportPenaltyPolicy.findOne({
    tenantId: toObjectId(tenantId),
    reportType: lsr.reportType,
    status: "active"
  }).lean();

  if (policy && policy.requireManagerApproval) {
    // Proceed — manager approval is required and this IS the manager approving
  }

  const extDeadline = extendedDeadline ? new Date(extendedDeadline) : new Date(Date.now() + 24 * 60 * 60 * 1000);

  lsr.status = "approved";
  lsr.respondedAt = new Date();
  lsr.respondedBy = toObjectId(respondedByUserId);
  lsr.managerNotes = managerNotes || null;
  lsr.extendedDeadline = extDeadline;
  await lsr.save();

  // Update WorkReport with new deadline and clear isLate flag
  await WorkReport.findByIdAndUpdate(lsr.workReportId, {
    $set: { submissionDeadline: extDeadline, isLate: false }
  });

  // If a pending penalty log exists for this report, waive it
  await ReportPenaltyLog.updateMany(
    { workReportId: lsr.workReportId, tenantId: toObjectId(tenantId), status: "pending" },
    {
      $set: {
        status: "waived",
        waiveReason: "Manager approved late submission request",
        waivedBy: toObjectId(respondedByUserId),
        waivedAt: new Date()
      }
    }
  );

  // Notify employee
  const employee = await User.findById(lsr.requestedBy).select("name email").lean();
  if (employee) {
    const submitLink = buildWorkReportLink(lsr.workReportId);
    await createNotification({
      userId: lsr.requestedBy,
      tenantId: toObjectId(tenantId),
      scope: "user",
      type: "LATE_SUBMISSION_APPROVED",
      title: `Late Submission Approved for ${lsr.reportType}`,
      body: `Your request to submit the ${lsr.reportType} report has been approved. New deadline: ${extDeadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
      link: submitLink,
      priority: "high",
      payload: { lsrId: String(lsr._id), workReportId: String(lsr.workReportId) }
    }).catch((err) => logger.warn({ err }, "Failed to send LSR approved notification"));

    if (employee.email) {
      await enqueueLateSubmissionApprovedEmail({
        to: employee.email,
        employeeName: employee.name,
        reportType: lsr.reportType,
        extendedDeadline: extDeadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        submitLink
      }).catch((err) => logger.warn({ err }, "Failed to enqueue LSR approved email"));
    }
  }

  logger.info({ lsrId, tenantId }, "Late submission request approved");
  return lsr;
}

// ── Manager: Reject ────────────────────────────────────────────────────────

/**
 * Manager rejects a late submission request.
 */
export async function rejectLateSubmission({
  tenantId,
  lsrId,
  respondedByUserId,
  managerNotes
}) {
  const lsr = await LateSubmissionRequest.findOne({
    _id: toObjectId(lsrId),
    tenantId: toObjectId(tenantId),
    status: "pending"
  });

  if (!lsr) throw ApiError.notFound("Late submission request not found or already resolved");

  lsr.status = "rejected";
  lsr.respondedAt = new Date();
  lsr.respondedBy = toObjectId(respondedByUserId);
  lsr.managerNotes = managerNotes || null;
  await lsr.save();

  // Mark report as isLate
  await WorkReport.findByIdAndUpdate(lsr.workReportId, { $set: { isLate: true } });

  // Notify employee
  const employee = await User.findById(lsr.requestedBy).select("name email").lean();
  if (employee) {
    await createNotification({
      userId: lsr.requestedBy,
      tenantId: toObjectId(tenantId),
      scope: "user",
      type: "LATE_SUBMISSION_REJECTED",
      title: `Late Submission Request Rejected for ${lsr.reportType}`,
      body: managerNotes
        ? `Your late submission request was rejected. Manager note: ${managerNotes}`
        : `Your late submission request for the ${lsr.reportType} report was rejected.`,
      priority: "high",
      payload: { lsrId: String(lsr._id), workReportId: String(lsr.workReportId) }
    }).catch((err) => logger.warn({ err }, "Failed to send LSR rejected notification"));

    if (employee.email) {
      await enqueueLateSubmissionRejectedEmail({
        to: employee.email,
        employeeName: employee.name,
        reportType: lsr.reportType,
        managerNotes: managerNotes || null
      }).catch((err) => logger.warn({ err }, "Failed to enqueue LSR rejected email"));
    }
  }

  logger.info({ lsrId, tenantId }, "Late submission request rejected");
  return lsr;
}

/**
 * Get a single late submission request by ID.
 */
export async function getLateSubmissionRequest({ tenantId, lsrId }) {
  const lsr = await LateSubmissionRequest.findOne({
    _id: toObjectId(lsrId),
    tenantId: toObjectId(tenantId)
  })
    .populate("requestedBy", "name email")
    .populate("workReportId", "reportType period submissionDeadline")
    .lean();

  if (!lsr) throw ApiError.notFound("Late submission request not found");
  return lsr;
}
