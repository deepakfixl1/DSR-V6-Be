import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { hasPermissionInRequest } from "#api/modules/rbac/rbac.middleware.js";
import * as service from "./goalAnalysis.service.js";

export const getDSRSuggestions = asyncHandler(async (req, res) => {
  const employeeMemberId = req.validated.query.employeeMemberId ?? req.membership?._id;
  const data = await service.getDSRSuggestions({
    tenantId: req.tenant.id,
    userId: req.user.id,
    employeeMemberId,
    date: req.validated.query.date ?? new Date(),
  });
  return res.status(200).json({ data });
});

export const analyzeReportGoals = asyncHandler(async (req, res) => {
  const data = await service.analyzeReportAgainstGoals({
    tenantId: req.tenant.id,
    reportId: req.validated.params.reportId,
  });
  return res.status(200).json({ data });
});

export const getPeriodGoalAnalysis = asyncHandler(async (req, res) => {
  const canViewAll = hasPermissionInRequest(req, "work_report.view_all");
  const employeeMemberId = canViewAll ? (req.validated.query.employeeMemberId ?? req.membership?._id) : req.membership?._id;

  const data = await service.getPeriodGoalAnalysis({
    tenantId: req.tenant.id,
    employeeMemberId,
    periodStart: req.validated.query.periodStart,
    periodEnd: req.validated.query.periodEnd,
    reportType: req.validated.query.reportType,
  });
  return res.status(200).json({ data });
});
