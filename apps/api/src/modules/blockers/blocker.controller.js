import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import * as blockerService from "./blocker.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
});

/**
 * Merge department scope into a blocker query.
 * - tenant-wide roles  → no extra filter
 * - department roles    → { departmentId }
 * - self (employee)     → { reporterId }  (employee sees own blockers only)
 */
function applyDeptScope(req, query = {}) {
  const scope = getDepartmentFilter(req);
  if (scope.departmentId) query.departmentId = scope.departmentId;
  // IMPORTANT: Blocker.reporterId stores User._id (not TenantMembership._id)
  if (scope.employeeMemberId) query.reporterId = req.user.id;
  return query;
}

export const createBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.createBlocker({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: blocker });
});

export const listBlockers = asyncHandler(async (req, res) => {
  const query = applyDeptScope(req, { ...req.validated.query });
  const result = await blockerService.listBlockers({
    tenantId: req.tenant.id,
    query,
  });
  return res.status(200).json(result);
});

export const getBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.getBlockerById({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
  });
  return res.status(200).json({ data: blocker });
});

export const updateBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.updateBlocker({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    payload: req.validated.body,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: blocker });
});

export const escalateBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.escalateBlocker({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    escalatedTo: req.validated.body?.escalatedTo,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: blocker });
});

export const resolveBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.resolveBlocker({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    resolutionNote: req.validated.body?.resolutionNote,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: blocker });
});

export const closeBlocker = asyncHandler(async (req, res) => {
  const blocker = await blockerService.closeBlocker({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: blocker });
});

export const deleteBlocker = asyncHandler(async (req, res) => {
  const result = await blockerService.deleteBlocker({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: result });
});

export const getBlockerStats = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await blockerService.getBlockerStats({
    tenantId: req.tenant.id,
    departmentId: scope.departmentId ?? undefined,
    reporterId: scope.employeeMemberId ?? undefined,
  });
  return res.status(200).json({ data });
});

export const listSlaBreachedBlockers = asyncHandler(async (req, res) => {
  const scope = getDepartmentFilter(req);
  const data = await blockerService.listSlaBreachedBlockers({
    tenantId: req.tenant.id,
    departmentId: scope.departmentId ?? undefined,
    reporterId: scope.employeeMemberId ?? undefined,
  });
  return res.status(200).json({ data });
});
