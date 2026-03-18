import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import * as service from "./analytics.service.js";

export const getEmployeeScorecard = asyncHandler(async (req, res) => {
  const data = await service.getEmployeeScorecard({ tenantId: req.validated.query.tenantId, memberId: req.validated.params.memberId });
  res.status(200).json({ data });
});

export const getTeamAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getTeamAnalytics({ tenantId: req.validated.query.tenantId, managerId: req.validated.params.managerId });
  res.status(200).json({ data });
});

export const getDepartmentAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getDepartmentAnalytics({ tenantId: req.validated.query.tenantId, deptId: req.validated.params.deptId });
  res.status(200).json({ data });
});

export const getReportScore = asyncHandler(async (req, res) => {
  const data = await service.getReportScore({ tenantId: req.validated.query.tenantId, id: req.validated.params.id });
  res.status(200).json({ data });
});

export const getEmployeeScoring = asyncHandler(async (req, res) => {
  const data = await service.getEmployeeScoring({ tenantId: req.validated.query.tenantId, memberId: req.validated.params.memberId });
  res.status(200).json({ data });
});

export const getLateSubmissions = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.getLateSubmissions({
    tenantId: req.validated.query.tenantId,
    departmentId: scope.departmentId ?? undefined,
    employeeMemberId: scope.employeeMemberId ?? undefined,
  });
  res.status(200).json({ data });
});

export const getWeeklyTrends = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.getWeeklyTrends({
    tenantId: req.validated.query.tenantId,
    departmentId: scope.departmentId ?? undefined,
    employeeMemberId: scope.employeeMemberId ?? undefined,
  });
  res.status(200).json({ data });
});
