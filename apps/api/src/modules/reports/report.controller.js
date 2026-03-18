import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { hasPermissionInRequest } from "#api/modules/rbac/rbac.middleware.js";
import * as reportService from "./report.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: report });
});

export const listReports = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "report.view_all");
  const result = await reportService.listReports({
    tenantId: req.tenant.id,
    query: req.validated.query,
    actorId: req.user.id,
    canViewAll,
  });
  return res.status(200).json(result);
});

export const getReport = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "report.view_all");
  const report = await reportService.getReportById({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    canViewAll,
  });
  return res.status(200).json({ data: report });
});

export const updateReport = asyncHandler(async (req, res) => {
  const report = await reportService.updateReport({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: report });
});

export const submitReport = asyncHandler(async (req, res) => {
  const report = await reportService.submitReport({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: report });
});

export const approveReport = asyncHandler(async (req, res) => {
  const report = await reportService.approveReport({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    comments: req.validated.body?.comments,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: report });
});

export const rejectReport = asyncHandler(async (req, res) => {
  const report = await reportService.rejectReport({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    comments: req.validated.body?.comments,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: report });
});
