import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import * as service from "./dashboard.service.js";

export const getStats = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.getDashboardStats({
    tenantId: req.validated.query.tenantId,
    actorId: req.user.id,
    departmentId: scope.departmentId ?? undefined,
    employeeMemberId: scope.employeeMemberId ?? undefined,
  });
  res.status(200).json({ data });
});

export const getTeamStats = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.getTeamStats({
    tenantId: req.validated.query.tenantId,
    actorId: req.user.id,
    departmentId: scope.departmentId ?? undefined,
  });
  res.status(200).json({ data });
});

export const getActivityFeed = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await service.getActivityFeed({
    tenantId: req.validated.query.tenantId,
    actorId: req.user.id,
    limit: req.validated.query.limit,
    departmentId: scope.departmentId ?? undefined,
    employeeMemberId: scope.employeeMemberId ?? undefined,
  });
  res.status(200).json({ data });
});
