import mongoose from "mongoose";
import ReportInstance from "#db/models/ReportInstance.model.js";
import ReportTemplateV2 from "#db/models/ReportTemplateV2.model.js";
import { ApiError } from "#api/utils/ApiError.js";
import { evaluateExpression } from "#api/utils/expressionEvaluator.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { emitEvent } from "#api/modules/events/eventBus.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const CORE_TYPE_CHECKS = {
  "core.text": (v) => typeof v === "string",
  "core.textarea": (v) => typeof v === "string",
  "core.number": (v) => typeof v === "number" && !Number.isNaN(v),
  "core.boolean": (v) => typeof v === "boolean",
  "core.date": (v) => v instanceof Date || !Number.isNaN(Date.parse(v)),
  "core.select": (v) => typeof v === "string",
  "core.multiSelect": (v) => Array.isArray(v),
  "core.user": (v) => typeof v === "string",
  "core.goal": (v) => typeof v === "string",
  "core.task": (v) => typeof v === "string",
  "core.rating": (v) => typeof v === "number" && !Number.isNaN(v),
  "core.file": (_v) => true,
  "core.table": (v) => Array.isArray(v),
};

const isPresent = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const evaluateCondition = (actual, condition, expected) => {
  switch (condition) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than":
      return typeof actual === "number" && actual > expected;
    case "less_than":
      return typeof actual === "number" && actual < expected;
    case "contains":
      return Array.isArray(actual) ? actual.includes(expected) : String(actual).includes(String(expected));
    case "in":
      return Array.isArray(expected) ? expected.includes(actual) : false;
    default:
      return false;
  }
};

export const validateReportData = (template, data, { partial = false } = {}) => {
  const errors = [];
  const sections = template.sections ?? [];
  for (const section of sections) {
    const sectionData = data?.[section.sectionId] ?? {};
    for (const field of section.fields ?? []) {
      const fieldValue = sectionData?.[field.fieldId];
      const shouldRequireByCondition = (() => {
        if (!field.conditionalLogic?.dependsOnField) return false;
        const dependsValue = sectionData?.[field.conditionalLogic.dependsOnField];
        if (dependsValue === undefined) return false;
        return evaluateCondition(
          dependsValue,
          field.conditionalLogic.condition,
          field.conditionalLogic.value
        );
      })();

      if (!partial && (field.required || shouldRequireByCondition)) {
        if (!isPresent(fieldValue)) {
          errors.push({
            fieldId: field.fieldId,
            message: "Field is required",
          });
          continue;
        }
      }

      if (!isPresent(fieldValue)) continue;

      const check = CORE_TYPE_CHECKS[field.type];
      if (check && !check(fieldValue)) {
        errors.push({ fieldId: field.fieldId, message: "Invalid field type" });
        continue;
      }

      if (field.type === "core.select" && Array.isArray(field.options)) {
        if (!field.options.includes(fieldValue)) {
          errors.push({ fieldId: field.fieldId, message: "Invalid option" });
        }
      }
      if (field.type === "core.multiSelect" && Array.isArray(field.options)) {
        const invalid = (fieldValue || []).filter((v) => !field.options.includes(v));
        if (invalid.length) {
          errors.push({ fieldId: field.fieldId, message: "Invalid options" });
        }
      }

      if (field.validation) {
        if (field.validation.min !== null && typeof fieldValue === "number" && fieldValue < field.validation.min) {
          errors.push({ fieldId: field.fieldId, message: "Value below minimum" });
        }
        if (field.validation.max !== null && typeof fieldValue === "number" && fieldValue > field.validation.max) {
          errors.push({ fieldId: field.fieldId, message: "Value above maximum" });
        }
        if (field.validation.maxLength && typeof fieldValue === "string") {
          if (fieldValue.length > field.validation.maxLength) {
            errors.push({ fieldId: field.fieldId, message: "Value exceeds max length" });
          }
        }
        if (field.validation.regex && typeof fieldValue === "string") {
          const re = new RegExp(field.validation.regex);
          if (!re.test(fieldValue)) {
            errors.push({ fieldId: field.fieldId, message: "Value does not match pattern" });
          }
        }
      }
    }
  }

  if (errors.length) {
    throw ApiError.badRequest("Validation failed", { errors });
  }

  return { ok: true };
};

const computeScore = (template, data) => {
  const scoring = template.scoringConfig ?? {};
  if (!scoring.enabled) return null;
  if (!scoring.calculationLogic) return null;
  const context = {};
  for (const section of template.sections ?? []) {
    const sectionData = data?.[section.sectionId] ?? {};
    for (const field of section.fields ?? []) {
      const numeric = ["core.number", "core.rating"].includes(field.type);
      const value = sectionData?.[field.fieldId];
      context[field.fieldId] = numeric && typeof value === "number" ? value : 0;
    }
  }
  try {
    const raw = evaluateExpression(scoring.calculationLogic, context);
    const maxScore = scoring.maxScore ?? 100;
    return Math.max(0, Math.min(maxScore, Number(raw)));
  } catch (_error) {
    return null;
  }
};

export async function createReport({ tenantId, actorId, payload, meta }) {
  const template = await ReportTemplateV2.findOne({
    _id: toObjectId(payload.templateId),
    tenantId: toObjectId(tenantId),
    status: "published",
  }).lean();
  if (!template) throw ApiError.badRequest("Template not found or not published");

  const data = payload.data ?? {};
  validateReportData(template, data, { partial: true });

  const report = await ReportInstance.create({
    tenantId: toObjectId(tenantId),
    templateId: toObjectId(payload.templateId),
    templateVersion: template.version,
    submittedBy: toObjectId(actorId),
    teamId: payload.teamId ? toObjectId(payload.teamId) : null,
    departmentId: payload.departmentId ? toObjectId(payload.departmentId) : null,
    period: payload.period,
    status: "draft",
    data,
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "report",
    entityId: report._id,
    action: "create",
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function listReports({ tenantId, query, actorId, canViewAll }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter = { tenantId: toObjectId(tenantId) };
  if (query.templateId) filter.templateId = toObjectId(query.templateId);
  if (query.userId) filter.submittedBy = toObjectId(query.userId);
  if (!canViewAll) filter.submittedBy = toObjectId(actorId);
  if (query.periodStart || query.periodEnd) {
    filter["period.startDate"] = {};
    if (query.periodStart) filter["period.startDate"].$gte = query.periodStart;
    if (query.periodEnd) filter["period.startDate"].$lte = query.periodEnd;
  }

  const [docs, total] = await Promise.all([
    ReportInstance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReportInstance.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getReportById({ tenantId, id, actorId, canViewAll }) {
  const filter = { _id: toObjectId(id), tenantId: toObjectId(tenantId) };
  if (!canViewAll) filter.submittedBy = toObjectId(actorId);
  const report = await ReportInstance.findOne(filter).lean();
  if (!report) throw ApiError.notFound("Report not found");
  return report;
}

export async function updateReport({ tenantId, id, payload, actorId, meta }) {
  const report = await ReportInstance.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    submittedBy: toObjectId(actorId),
  });
  if (!report) throw ApiError.notFound("Report not found");
  if (report.status !== "draft") throw ApiError.badRequest("Only draft reports can be updated");

  const template = await ReportTemplateV2.findOne({
    _id: report.templateId,
    tenantId: toObjectId(tenantId),
    version: report.templateVersion,
  }).lean();
  if (!template) throw ApiError.badRequest("Template not found");

  const before = report.toObject();

  if (payload.teamId !== undefined) report.teamId = payload.teamId ? toObjectId(payload.teamId) : null;
  if (payload.departmentId !== undefined) {
    report.departmentId = payload.departmentId ? toObjectId(payload.departmentId) : null;
  }
  if (payload.period !== undefined) report.period = payload.period;
  if (payload.data !== undefined) report.data = payload.data;

  validateReportData(template, report.data ?? {}, { partial: true });
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "report",
    entityId: report._id,
    action: "update",
    before,
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function submitReport({ tenantId, id, actorId, meta }) {
  const report = await ReportInstance.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    submittedBy: toObjectId(actorId),
  });
  if (!report) throw ApiError.notFound("Report not found");
  if (report.status !== "draft") throw ApiError.badRequest("Report is not in draft status");

  const template = await ReportTemplateV2.findOne({
    _id: report.templateId,
    tenantId: toObjectId(tenantId),
    version: report.templateVersion,
  }).lean();
  if (!template) throw ApiError.badRequest("Template not found");

  validateReportData(template, report.data ?? {}, { partial: false });
  const score = computeScore(template, report.data ?? {});

  const before = report.toObject();
  report.status = "submitted";
  report.submittedAt = new Date();
  report.calculatedScore = score;
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "report",
    entityId: report._id,
    action: "submit",
    before,
    after: report.toObject(),
    meta,
  });

  emitEvent("report.submitted", { tenantId, reportId: report._id });

  return report.toObject();
}

export async function approveReport({ tenantId, id, actorId, comments, meta }) {
  const report = await ReportInstance.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!report) throw ApiError.notFound("Report not found");
  if (report.status !== "submitted") {
    throw ApiError.badRequest("Only submitted reports can be approved");
  }

  const before = report.toObject();
  report.status = "approved";
  report.approvalFlow = {
    required: true,
    approvedBy: toObjectId(actorId),
    approvedAt: new Date(),
    comments: comments ?? null,
  };
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "report",
    entityId: report._id,
    action: "approve",
    before,
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function rejectReport({ tenantId, id, actorId, comments, meta }) {
  const report = await ReportInstance.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!report) throw ApiError.notFound("Report not found");
  if (report.status !== "submitted") {
    throw ApiError.badRequest("Only submitted reports can be rejected");
  }

  const before = report.toObject();
  report.status = "rejected";
  report.approvalFlow = {
    required: true,
    approvedBy: toObjectId(actorId),
    approvedAt: new Date(),
    comments: comments ?? null,
  };
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "report",
    entityId: report._id,
    action: "reject",
    before,
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}
