/**
 * Penalty Policy & Log service.
 * Admin/owner can configure penalty policies per report type and manage penalty logs.
 */

import mongoose from "mongoose";
import { ReportPenaltyPolicy, ReportPenaltyLog, User } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";

const toObjectId = (v) => new mongoose.Types.ObjectId(String(v));

// ── Penalty Policies ───────────────────────────────────────────────────────

export async function listPenaltyPolicies({ tenantId, reportType = null, status = null }) {
  const filter = { tenantId: toObjectId(tenantId) };
  if (reportType) filter.reportType = reportType;
  if (status) filter.status = status;

  const docs = await ReportPenaltyPolicy.find(filter)
    .sort({ reportType: 1, createdAt: -1 })
    .lean();
  return docs;
}

export async function getPenaltyPolicy({ tenantId, policyId }) {
  const doc = await ReportPenaltyPolicy.findOne({
    _id: toObjectId(policyId),
    tenantId: toObjectId(tenantId)
  }).lean();
  if (!doc) throw ApiError.notFound("Penalty policy not found");
  return doc;
}

export async function createPenaltyPolicy({ tenantId, createdByUserId, data }) {
  const {
    name,
    description,
    reportType,
    reminders = [],
    penaltyType = "warning",
    deductionFraction = 0.25,
    customPenaltyDescription,
    gracePeriodMinutes = 0,
    autoApplyPenalty = false,
    allowLateSubmissionRequest = true,
    requireManagerApproval = true,
    status = "active"
  } = data;

  const doc = await ReportPenaltyPolicy.create({
    tenantId: toObjectId(tenantId),
    name,
    description,
    reportType,
    reminders,
    penaltyType,
    deductionFraction: penaltyType === "salary_deduction" ? deductionFraction : 0.25,
    customPenaltyDescription: penaltyType === "custom" ? customPenaltyDescription : null,
    gracePeriodMinutes,
    autoApplyPenalty,
    allowLateSubmissionRequest,
    requireManagerApproval,
    status,
    createdBy: toObjectId(createdByUserId)
  });

  logger.info({ policyId: doc._id, tenantId, reportType }, "Penalty policy created");
  return doc;
}

export async function updatePenaltyPolicy({ tenantId, policyId, data }) {
  const doc = await ReportPenaltyPolicy.findOne({
    _id: toObjectId(policyId),
    tenantId: toObjectId(tenantId)
  });
  if (!doc) throw ApiError.notFound("Penalty policy not found");

  const allowedFields = [
    "name", "description", "reminders", "penaltyType",
    "deductionFraction", "customPenaltyDescription",
    "gracePeriodMinutes", "autoApplyPenalty",
    "allowLateSubmissionRequest", "requireManagerApproval", "status"
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) doc[field] = data[field];
  }

  await doc.save();
  logger.info({ policyId, tenantId }, "Penalty policy updated");
  return doc;
}

export async function deletePenaltyPolicy({ tenantId, policyId }) {
  const doc = await ReportPenaltyPolicy.findOne({
    _id: toObjectId(policyId),
    tenantId: toObjectId(tenantId)
  });
  if (!doc) throw ApiError.notFound("Penalty policy not found");
  await doc.deleteOne();
  logger.info({ policyId, tenantId }, "Penalty policy deleted");
  return { success: true };
}

// ── Penalty Logs ───────────────────────────────────────────────────────────

export async function listPenaltyLogs({
  tenantId,
  employeeId = null,
  reportType = null,
  status = null,
  page = 1,
  limit = 20
}) {
  const filter = { tenantId: toObjectId(tenantId) };
  if (employeeId) filter.employeeId = toObjectId(employeeId);
  if (reportType) filter.reportType = reportType;
  if (status) filter.status = status;

  const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100));
  const actualLimit = Math.max(1, Math.min(limit, 100));

  const [docs, total] = await Promise.all([
    ReportPenaltyLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .populate("employeeId", "name email")
      .populate("workReportId", "reportType period submissionDeadline")
      .populate("policyId", "name penaltyType")
      .lean(),
    ReportPenaltyLog.countDocuments(filter)
  ]);

  return { docs, total, page: Math.max(1, page), limit: actualLimit, pages: Math.ceil(total / actualLimit) };
}

export async function getPenaltyLog({ tenantId, logId }) {
  const doc = await ReportPenaltyLog.findOne({
    _id: toObjectId(logId),
    tenantId: toObjectId(tenantId)
  })
    .populate("employeeId", "name email")
    .populate("workReportId", "reportType period submissionDeadline")
    .populate("policyId", "name penaltyType deductionFraction")
    .lean();

  if (!doc) throw ApiError.notFound("Penalty log not found");
  return doc;
}

/**
 * Admin manually applies a penalty to an employee for a missed report.
 */
export async function applyPenaltyManually({
  tenantId,
  appliedByUserId,
  employeeId,
  workReportId,
  policyId,
  reportType,
  penaltyType,
  deductionFraction,
  description,
  missedDeadline,
  period
}) {
  const doc = await ReportPenaltyLog.create({
    tenantId: toObjectId(tenantId),
    employeeId: toObjectId(employeeId),
    workReportId: workReportId ? toObjectId(workReportId) : null,
    policyId: policyId ? toObjectId(policyId) : null,
    reportType,
    penaltyType,
    deductionFraction: penaltyType === "salary_deduction" ? deductionFraction : null,
    description,
    missedDeadline: new Date(missedDeadline),
    period,
    status: "applied",
    appliedBy: toObjectId(appliedByUserId),
    appliedAt: new Date(),
    autoApplied: false
  });

  logger.info({ penaltyLogId: doc._id, tenantId, employeeId }, "Manual penalty applied");
  return doc;
}

/**
 * Admin waives a pending or applied penalty.
 */
export async function waivePenalty({ tenantId, logId, waivedByUserId, waiveReason }) {
  const doc = await ReportPenaltyLog.findOne({
    _id: toObjectId(logId),
    tenantId: toObjectId(tenantId)
  });

  if (!doc) throw ApiError.notFound("Penalty log not found");
  if (doc.status === "waived") throw ApiError.conflict("Penalty is already waived");

  doc.status = "waived";
  doc.waivedBy = toObjectId(waivedByUserId);
  doc.waivedAt = new Date();
  doc.waiveReason = waiveReason || null;
  await doc.save();

  logger.info({ logId, tenantId }, "Penalty waived");
  return doc;
}
