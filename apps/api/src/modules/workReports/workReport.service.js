import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { Department, ReportTemplate, ReportTemplateV2, TenantMembership, WorkGoal, WorkReport } from "#db/models/index.js";
import { checkDeadlineForSubmit } from "#api/modules/deadline-policies/deadlinePolicy.service.js";
import DepartmentModel from "#db/models/Department.model.js";
import { emitEvent } from "#api/modules/events/eventBus.js";
import { publishWsEvent } from "#api/modules/events/ws.events.js";
import { createNotification } from "#api/modules/notification/notification.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const assertPeriod = (period) => {
  if (!period) return;
  if (new Date(period.endDate) < new Date(period.startDate)) {
    throw ApiError.badRequest("period.endDate must be greater than or equal to period.startDate");
  }
};

const assertGoalsInTenant = async (tenantId, goalIds = []) => {
  if (!goalIds?.length) return;
  const goalObjectIds = goalIds.map((id) => toObjectId(id));
  const count = await WorkGoal.countDocuments({
    tenantId: toObjectId(tenantId),
    _id: { $in: goalObjectIds },
  });
  if (count !== goalObjectIds.length) {
    throw ApiError.badRequest("One or more goalIds are invalid for this tenant");
  }
};

const mapReportTypeToTemplateType = (reportType) => {
  switch (reportType) {
    case "DSR":
      return "daily";
    case "WSR":
      return "weekly";
    case "MSR":
      return "monthly";
    case "QSR":
      return "quarterly";
    case "YSR":
      return "yearly";
    default:
      return "custom";
  }
};

const resolveTemplateForDepartment = async ({ tenantId, departmentId, reportType }) => {
  // If departmentId provided, try to find department-specific template
  if (departmentId) {
    const department = await DepartmentModel.findOne({
      _id: toObjectId(departmentId),
      tenantId: toObjectId(tenantId),
    }).lean();

    if (!department) {
      throw ApiError.badRequest("departmentId must belong to this tenant");
    }

    const mappedTemplateId = department.templateId?._id || department.templateId;
    if (mappedTemplateId) {
      const template = await ReportTemplate.findOne({
        _id: toObjectId(mappedTemplateId),
        status: "active",
      }).lean();
      if (template) return template;
    }
  }

  // Fall back to any active template for this tenant matching the report type
  const mappedType = reportType === "DSR" ? "DSR" : reportType === "WSR" ? "WSR" : reportType ?? "DSR";
  const fallback = await ReportTemplate.findOne({
    tenantId: toObjectId(tenantId),
    reportType: mappedType,
    status: "active",
  }).lean();

  if (fallback) return fallback;

  // Last resort: any active template for this tenant
  const any = await ReportTemplate.findOne({
    tenantId: toObjectId(tenantId),
    status: "active",
  }).lean();

  if (any) return any;

  throw ApiError.badRequest("No active report template found for this tenant. Please ask your admin to configure one.");
};
function validateReportContentAgainstTemplate(_template, content) {
  // Content is user-authored free-form data; only ensure it's an object.
  if (content !== undefined && content !== null && typeof content !== "object") {
    throw ApiError.badRequest("content must be an object");
  }
}

export async function createWorkReport({ tenantId, actorId , payload, meta }) {
  assertPeriod(payload.period);
  await assertGoalsInTenant(tenantId, payload.goalIds ?? []);

  console.log("Creating work report with payload", { tenantId, actorId, payload });
  const template = await resolveTemplateForDepartment({
    tenantId,
    departmentId: payload.departmentId,
    reportType: payload.reportType,
  });

  validateReportContentAgainstTemplate(template, payload.content);

  // find employe account 
  const member=await TenantMembership.findOne({
    tenantId: toObjectId(tenantId),
  userId: toObjectId(actorId),})

  if(!member){
    throw new ApiError("Employee membership not found for the user in this tenant");
  }
  const report = await WorkReport.create({
    tenantId:tenantId,
    employeeMemberId:member._id,
    departmentId:payload.departmentId,
    templateId: template._id,
    reportType: payload.reportType,
    period: payload.period,
    contentTitle: payload.contentTitle ?? template.name ?? null,
    description: payload.description ?? template.description ?? null,
    content: payload.content,
    goalIds: (payload.goalIds ?? []).map((id) => toObjectId(id)),
    sourceReportIds: (payload.sourceReportIds ?? []).map((id) => toObjectId(id)),
    status: "DRAFT",
    submissionDeadline: payload.submissionDeadline ?? payload.period?.endDate ?? null,
    aiSuggestionSnapshot: payload.aiSuggestionSnapshot ?? null,
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "create",
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function updateWorkReport({ tenantId, actorId, employeeMemberId, id, payload, meta }) {
  const report = await WorkReport.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    employeeMemberId: toObjectId(employeeMemberId),
  });
  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status !== "DRAFT") throw ApiError.badRequest("Only DRAFT reports can be edited");

  const before = report.toObject();

  if (payload.period !== undefined) {
    assertPeriod(payload.period);
    report.period = payload.period;
  }
  if (payload.content !== undefined) report.content = payload.content;
  if (payload.contentTitle !== undefined) report.contentTitle = payload.contentTitle;
  if (payload.description !== undefined) report.description = payload.description;
  if (payload.goalIds !== undefined) {
    await assertGoalsInTenant(tenantId, payload.goalIds);
    report.goalIds = payload.goalIds.map((goalId) => toObjectId(goalId));
  }
  if (payload.sourceReportIds !== undefined) {
    report.sourceReportIds = payload.sourceReportIds.map((reportId) => toObjectId(reportId));
  }
  if (payload.departmentId !== undefined) {
    report.departmentId = toObjectId(payload.departmentId);
  }
  if (payload.templateId !== undefined) {
    const template = await ReportTemplateV2.findOne({
      _id: toObjectId(payload.templateId),
      tenantId: toObjectId(tenantId),
      status: "published",
    }).lean();
    if (!template) throw ApiError.badRequest("templateId not found or not published");
    report.templateId = template._id;
  }

  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "update",
    before,
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function submitWorkReport({ tenantId, actorId, id, meta }) {
  const member=await TenantMembership.findOne({
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),})
    if(!member){
      throw new ApiError("Employee membership not found for the user in this tenant");
    }
    console.log("Submitting work report", { tenantId, actorId, id });
  const report = await WorkReport.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    employeeMemberId:member._id,
  });
  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status !== "DRAFT") throw ApiError.badRequest("Only DRAFT reports can be submitted");

  // if (!Array.isArray(report.goalIds) || report.goalIds.length < 1) {
  //   throw ApiError.badRequest("At least one goalId is required before submitting a report");
  // }

  // Enforce active deadline policies for this report type
  const deadlineCheck = await checkDeadlineForSubmit({
    tenantId,
    reportType: report.reportType,
    submittedAt: new Date(),
  });
  if (deadlineCheck.blocked) {
    throw ApiError.forbidden(
      `Submission deadline has passed for ${report.reportType} (policy: "${deadlineCheck.policyName}", deadline: ${deadlineCheck.deadline}).` +
      (deadlineCheck.allowExtensionRequest ? " You can request a manager extension." : "")
    );
  }

  const before = report.toObject();
  report.status = "SUBMITTED";
  report.submittedAt = new Date();
  report.isLate = Boolean(report.submissionDeadline && report.submittedAt > report.submissionDeadline);
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "submit",
    before,
    after: report.toObject(),
    meta,
  });

  emitEvent("report.submitted", { tenantId, reportId: report._id });
  await publishWsEvent({
    tenantId,
    event: "report:submitted",
    payload: { tenantId, reportId: String(report._id), actorId, status: report.status },
  });

  // Notify manager that a report was submitted
  try {
    if (member.managerId) {
      const manager = await TenantMembership.findOne({
        _id: member.managerId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (manager?.userId) {
        await createNotification({
          userId: manager.userId,
          memberId: manager._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "REPORT_SUBMITTED",
          title: "New report submitted",
          body: `A ${report.reportType} report has been submitted and is awaiting your review.`,
          link: `/reports/${report._id}`,
          priority: "normal",
          payload: { reportId: String(report._id), reportType: report.reportType },
        });
      }
    }
  } catch (_) { /* notification failure must not block the main operation */ }

  return report.toObject();
}

export async function approveWorkReport({ tenantId, actorId, id, comments, meta, departmentId }) {
  const filter = {
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  };
  // Department-scoped managers can only approve reports from their department
  if (departmentId) filter.departmentId = toObjectId(departmentId);

  const report = await WorkReport.findOne(filter);
  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status !== "SUBMITTED") throw ApiError.badRequest("Only SUBMITTED reports can be approved");

  const before = report.toObject();
  report.status = "APPROVED";
  report.approvedAt = new Date();
  report.rejectedAt = null;
  report.rejectionReason = null;
  report.approvedByManagerId = toObjectId(actorId);
  report.managerComments = comments ?? null;
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "approve",
    before,
    after: report.toObject(),
    meta,
  });

  await publishWsEvent({
    tenantId,
    event: "report:approved",
    payload: { tenantId, reportId: String(report._id), actorId, status: report.status },
  });

  // Notify the employee their report was approved
  try {
    const employeeMembership = await TenantMembership.findById(report.employeeMemberId).lean();
    if (employeeMembership?.userId) {
      await createNotification({
        userId: employeeMembership.userId,
        memberId: employeeMembership._id,
        tenantId: toObjectId(tenantId),
        scope: "user",
        type: "REPORT_APPROVED",
        title: "Report approved",
        body: `Your ${report.reportType} report has been approved.${comments ? ` Manager note: ${comments}` : ""}`,
        link: `/reports/${report._id}`,
        priority: "normal",
        payload: { reportId: String(report._id), reportType: report.reportType },
      });
    }
  } catch (_) { /* non-blocking */ }

  return report.toObject();
}

export async function rejectWorkReport({ tenantId, actorId, id, comments, meta, departmentId }) {
  const filter = {
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  };
  if (departmentId) filter.departmentId = toObjectId(departmentId);

  const report = await WorkReport.findOne(filter);
  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status !== "SUBMITTED") throw ApiError.badRequest("Only SUBMITTED reports can be rejected");

  const before = report.toObject();
  report.status = "REJECTED";
  report.approvedAt = null;
  report.rejectedAt = new Date();
  report.approvedByManagerId = toObjectId(actorId);
  report.managerComments = comments ?? null;
  report.rejectionReason = comments ?? null;
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "reject",
    before,
    after: report.toObject(),
    meta,
  });

  // Notify the employee their report was rejected
  try {
    const employeeMembership = await TenantMembership.findById(report.employeeMemberId).lean();
    if (employeeMembership?.userId) {
      await createNotification({
        userId: employeeMembership.userId,
        memberId: employeeMembership._id,
        tenantId: toObjectId(tenantId),
        scope: "user",
        type: "REPORT_REJECTED",
        title: "Report rejected",
        body: `Your ${report.reportType} report has been rejected.${comments ? ` Reason: ${comments}` : " Please revise and resubmit."}`,
        link: `/reports/${report._id}`,
        priority: "high",
        payload: { reportId: String(report._id), reportType: report.reportType, reason: comments ?? null },
      });
    }
  } catch (_) { /* non-blocking */ }

  return report.toObject();
}

export async function listWorkReports({ tenantId, query, canViewAll, employeeMemberId }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter = { tenantId: toObjectId(tenantId) };
  if (query.employeeMemberId) filter.employeeMemberId = toObjectId(query.employeeMemberId);
  // If no dept scope and not canViewAll, restrict to own reports only
  if (!canViewAll && !query.departmentId && !query.employeeMemberId) {
    filter.employeeMemberId = toObjectId(employeeMemberId);
  }
  if (query.reportType) filter.reportType = query.reportType;
  if (query.status) {
    filter.status = query.status;
  } else if (query.excludeDraft) {
    filter.status = { $ne: "DRAFT" };
  }
  if (query.departmentId) filter.departmentId = toObjectId(query.departmentId);
  if (query.periodStart || query.periodEnd) {
    filter["period.startDate"] = {};
    if (query.periodStart) filter["period.startDate"].$gte = query.periodStart;
    if (query.periodEnd) filter["period.startDate"].$lte = query.periodEnd;
  }

  const [docs, total] = await Promise.all([
    WorkReport.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WorkReport.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getWorkReportById({ tenantId, id, canViewAll, employeeMemberId, departmentId }) {
  const filter = { _id: toObjectId(id), tenantId: toObjectId(tenantId) };
  if (!canViewAll) {
    if (departmentId) {
      // Manager/dept-head scope: can view any report in their department
      filter.departmentId = toObjectId(departmentId);
    } else {
      // Employee scope: own reports only
      filter.employeeMemberId = toObjectId(employeeMemberId);
    }
  }

  const report = await WorkReport.findOne(filter).lean();
  if (!report) throw ApiError.notFound("Work report not found");
  return report;
}

export async function getCreationTemplate({ tenantId, reportType, departmentId }) {
  const template = await resolveTemplateForDepartment({
    tenantId,
    departmentId,
    reportType,
    templateId: null,
  });
  return template;
}

export async function listMyWorkReports({ tenantId, actorId, query = {} }) {
  const membership = await TenantMembership.findOne({
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
    status: "active",
  }).lean();

  if (!membership) throw ApiError.forbidden("Tenant membership required");

  return listWorkReports({
    tenantId,
    query,
    canViewAll: false,
    employeeMemberId: membership._id,
  });
}

export async function deleteWorkReport({ tenantId, actorId, id, meta }) {
  const membership = await TenantMembership.findOne({
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
    status: "active",
  }).lean();

  const filter = {
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  };
  if (!membership?.isOwner) {
    filter.employeeMemberId = membership?._id ?? null;
  }

  const report = await WorkReport.findOne(filter);
  if (!report) throw ApiError.notFound("Work report not found");
  if (report.status === "APPROVED") {
    throw ApiError.badRequest("Approved reports cannot be deleted");
  }

  const before = report.toObject();
  await report.deleteOne();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "delete",
    before,
    after: null,
    meta,
  });

  return { success: true };
}

export async function reopenWorkReport({ tenantId, actorId, id, meta }) {
  const report = await WorkReport.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!report) throw ApiError.notFound("Work report not found");
  if (!["REJECTED", "APPROVED"].includes(report.status)) {
    throw ApiError.badRequest("Only reviewed reports can be reopened");
  }

  const before = report.toObject();
  report.status = "DRAFT";
  report.approvedAt = null;
  report.rejectedAt = null;
  report.approvedByManagerId = null;
  report.managerComments = null;
  report.rejectionReason = null;
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "reopen",
    before,
    after: report.toObject(),
    meta,
  });

  return report.toObject();
}

export async function bulkApproveWorkReports({ tenantId, actorId, reportIds = [], comments, meta, departmentId }) {
  const session = await mongoose.startSession();
  try {
    let approved = [];
    await session.withTransaction(async () => {
      const bulkFilter = {
        tenantId: toObjectId(tenantId),
        _id: { $in: reportIds.map((id) => toObjectId(id)) },
        status: "SUBMITTED",
      };
      // Department-scoped managers can only bulk-approve within their department
      if (departmentId) bulkFilter.departmentId = toObjectId(departmentId);

      const reports = await WorkReport.find(bulkFilter).session(session);

      if (!reports.length) {
        throw ApiError.badRequest("No submitted reports found for bulk approval");
      }

      for (const report of reports) {
        const before = report.toObject();
        report.status = "APPROVED";
        report.approvedAt = new Date();
        report.approvedByManagerId = toObjectId(actorId);
        report.managerComments = comments ?? null;
        report.rejectionReason = null;
        report.rejectedAt = null;
        await report.save({ session });

        await recordAudit({
          tenantId,
          actorId,
          entityType: "work_report",
          entityId: report._id,
          action: "bulk_approve",
          before,
          after: report.toObject(),
          meta,
        });

        approved.push(report.toObject());
      }
    });

    await Promise.all(
      approved.map((report) =>
        publishWsEvent({
          tenantId,
          event: "report:approved",
          payload: { tenantId, reportId: String(report._id), actorId, status: report.status },
        })
      )
    );

    // Notify each employee their report was bulk-approved
    try {
      const memberIds = [...new Set(approved.map((r) => String(r.employeeMemberId)).filter(Boolean))];
      const memberships = await TenantMembership.find({ _id: { $in: memberIds } }).lean();
      await Promise.all(
        memberships
          .filter((m) => m.userId)
          .map((m) => {
            const report = approved.find((r) => String(r.employeeMemberId) === String(m._id));
            return createNotification({
              userId: m.userId,
              memberId: m._id,
              tenantId: toObjectId(tenantId),
              scope: "user",
              type: "REPORT_APPROVED",
              title: "Report approved",
              body: `Your ${report?.reportType ?? "work"} report has been approved.${comments ? ` Manager note: ${comments}` : ""}`,
              link: `/reports/${report?._id}`,
              priority: "normal",
              payload: { reportId: String(report?._id), reportType: report?.reportType },
            }).catch(() => {});
          })
      );
    } catch (_) { /* non-blocking */ }

    return { count: approved.length, reports: approved };
  } finally {
    await session.endSession();
  }
}

export async function listWorkReportComments({ tenantId, id, canViewAll, employeeMemberId }) {
  const report = await getWorkReportById({ tenantId, id, canViewAll, employeeMemberId });
  return report.comments ?? [];
}

export async function addWorkReportComment({ tenantId, actorId, id, message, meta }) {
  const report = await WorkReport.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!report) throw ApiError.notFound("Work report not found");

  const before = report.toObject();
  report.comments.push({
    authorId: toObjectId(actorId),
    message,
    createdAt: new Date(),
  });
  await report.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "work_report",
    entityId: report._id,
    action: "comment",
    before,
    after: report.toObject(),
    meta,
  });

  return report.comments;
}
