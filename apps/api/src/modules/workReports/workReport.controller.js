import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import { hasPermissionInRequest } from "#api/modules/rbac/rbac.middleware.js";
import * as service from "./workReport.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
});

/**
 * Merge department scope into a work-report query.
 * - tenant-wide roles  → no extra filter (full visibility)
 * - department roles    → { departmentId }
 * - self (employee)     → { employeeMemberId } (own reports only)
 */
function applyDeptScope(req, query = {}) {
  const scope = getDepartmentFilter(req);
  if (scope.departmentId) query.departmentId = scope.departmentId;
  if (scope.employeeMemberId) query.employeeMemberId = scope.employeeMemberId;
  return query;
}

export const createWorkReport = asyncHandler(async (req, res) => {
  // If departmentId is not in the body, fall back to the user's department from scope.
  const departmentId =
    req.validated.body.departmentId ?? req.departmentScope?.departmentId ?? null;
  const data = await service.createWorkReport({
    tenantId: req.params.tenantId,
    actorId: req.user.id,
    payload: { ...req.validated.body, departmentId },
    meta: buildMeta(req),
  });
  return res.status(201).json({ data });
});

export const updateWorkReport = asyncHandler(async (req, res) => {
  const data = await service.updateWorkReport({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    employeeMemberId: req.membership._id,
    id: req.validated.params.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data });
});

export const submitWorkReport = asyncHandler(async (req, res) => {
  const data = await service.submitWorkReport({
    tenantId: req.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data });
});

export const approveWorkReport = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.approveWorkReport({
    tenantId: req.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    comments: req.validated.body?.comments,
    meta: buildMeta(req),
    departmentId: scope.departmentId ?? null,
  });
  return res.status(200).json({ data });
});

export const rejectWorkReport = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.rejectWorkReport({
    tenantId: req.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    comments: req.validated.body?.comments,
    meta: buildMeta(req),
    departmentId: scope.departmentId ?? null,
  });
  return res.status(200).json({ data });
});

export const listWorkReports = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "report.view_all");
  const query = applyDeptScope(req, { ...req.validated.query });
  const result = await service.listWorkReports({
    tenantId: req.tenant.id,
    query,
    canViewAll,
    employeeMemberId: req.membership._id,
  });
  return res.status(200).json(result);
});

export const getWorkReport = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "report.view_all");
  const scope = getDepartmentFilter(req);
  const data = await service.getWorkReportById({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    canViewAll,
    employeeMemberId: req.membership._id,
    departmentId: scope.departmentId ?? null,
  });
  return res.status(200).json({ data });
});

export const getReportTemplate = asyncHandler(async (req, res) => {
  const template = await service.getCreationTemplate({
    tenantId: req.params.tenantId,
    reportType: req.validated.params.reportType,
    departmentId: req.validated.query.departmentId,
  });
  return res.status(200).json({ data: template });
});

export const listMyWorkReports = asyncHandler(async (req, res) => {
  const result = await service.listMyWorkReports({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    query: req.validated.query,
  });
  return res.status(200).json(result);
});

export const deleteWorkReport = asyncHandler(async (req, res) => {
  const data = await service.deleteWorkReport({
    tenantId: req.validated.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data });
});

export const reopenWorkReport = asyncHandler(async (req, res) => {
  const data = await service.reopenWorkReport({
    tenantId: req.validated.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data });
});

export const bulkApproveWorkReports = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.bulkApproveWorkReports({
    tenantId: req.validated.body.tenantId,
    actorId: req.user.id,
    reportIds: req.validated.body.reportIds,
    comments: req.validated.body.comments,
    meta: buildMeta(req),
    departmentId: scope.departmentId ?? null,
  });
  return res.status(200).json({ data });
});

export const listWorkReportComments = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "report.view_all");
  const data = await service.listWorkReportComments({
    tenantId: req.validated.params.tenantId,
    id: req.validated.params.id,
    canViewAll,
    employeeMemberId: req.membership?._id,
  });
  return res.status(200).json({ data });
});

export const addWorkReportComment = asyncHandler(async (req, res) => {
  const data = await service.addWorkReportComment({
    tenantId: req.validated.params.tenantId,
    actorId: req.user.id,
    id: req.validated.params.id,
    message: req.validated.body.message,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data });
});
