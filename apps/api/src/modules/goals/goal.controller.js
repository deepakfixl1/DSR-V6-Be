import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import * as goalService from "./goal.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
});

/**
 * Merge department scope into a goal query.
 * - tenant-wide roles  → no extra filter
 * - department roles    → { departmentId }
 * - self (employee)     → { ownerId } (sees own goals only)
 */
function applyDeptScope(req, query = {}) {
  const scope = getDepartmentFilter(req);
  if (scope.departmentId) query.departmentId = scope.departmentId;
  if (scope.employeeMemberId) query.ownerId = scope.employeeMemberId;
  return query;
}

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.createGoal({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: goal });
});

export const listGoals = asyncHandler(async (req, res) => {
  const query = applyDeptScope(req, { ...req.validated.query });
  const result = await goalService.listGoals({
    tenantId: req.tenant.id,
    query,
  });
  return res.status(200).json(result);
});

export const getGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.getGoalById({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
  });
  return res.status(200).json({ data: goal });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.updateGoal({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    payload: req.validated.body,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: goal });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const result = await goalService.deleteGoal({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json(result);
});

export const updateKeyResult = asyncHandler(async (req, res) => {
  const goal = await goalService.updateKeyResult({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    krIndex: req.validated.params.krIndex,
    currentValue: req.validated.body.currentValue,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: goal });
});
