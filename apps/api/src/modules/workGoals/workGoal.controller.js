import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";
import { ApiError } from "#api/utils/ApiError.js";
import * as service from "./workGoal.service.js";

/** Roles that can manage department goals (create/edit/delete without ownership check) */
const GOAL_MANAGER_ROLES = new Set(["tenant_owner", "owner", "tenant_admin", "hr_manager", "manager"]);

/** Only pure admin roles get goals auto-approved — everyone else goes PENDING */
const GOAL_AUTO_APPROVE_ROLES = new Set(["tenant_owner", "owner", "tenant_admin"]);

/** Roles that can create goals (all except unknown roles) */
const GOAL_CREATOR_ROLES = new Set([...GOAL_MANAGER_ROLES, "employee", "team_lead", "department_head"]);

/** Roles that can approve / reject goals from others */
const GOAL_APPROVER_ROLES = new Set(["tenant_owner", "owner", "tenant_admin", "hr_manager", "manager", "department_head"]);

function normalizeRole(req) {
  if (req.membership?.isOwner) return "tenant_owner";
  return (req.rbac?.roleName ?? "employee").toLowerCase().replace(/\s+/g, "_");
}

function assertCanManageGoals(req) {
  const role = normalizeRole(req);
  if (!GOAL_MANAGER_ROLES.has(role)) {
    throw ApiError.forbidden("Only admins and owners can manage department goals");
  }
}

function isDepartmentHead(req) {
  return normalizeRole(req) === "department_head";
}

/** Check if user owns the goal (assigned to their membership) */
function isGoalOwner(req, goal) {
  const membershipId = String(req.membership?._id ?? "");
  return membershipId && String(goal?.assignedToMemberId ?? "") === membershipId;
}

const meta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
  method: req.method,
  path: req.originalUrl,
  requestId: req.id ?? null,
});

/**
 * Merge department scope into a work-goal query.
 * - tenant-wide roles  → no extra filter
 * - department roles    → { departmentId }
 * - self (employee)     → { assignedToMemberId } (own goals only)
 *
 * Special case: if an employee explicitly requests a specific departmentId
 * that matches their own assigned department (dept-goals view), allow them
 * to see ALL goals for that department rather than just their own.
 */
function applyDeptScope(req, query = {}) {
  const scope = getDepartmentFilter(req);
  if (scope.departmentId) query.departmentId = scope.departmentId;
  if (scope.employeeMemberId) {
    const requestedDeptId = query.departmentId ?? req.query?.departmentId;
    const empDeptId = req.departmentScope?.departmentId;
    const isViewingOwnDept =
      requestedDeptId && empDeptId &&
      String(requestedDeptId) === String(empDeptId);
    if (!isViewingOwnDept) {
      query.assignedToMemberId = scope.employeeMemberId;
    }
  }
  return query;
}

export const createWorkGoal = asyncHandler(async (req, res) => {
  const role = normalizeRole(req);
  const isHead = isDepartmentHead(req);

  // All creator roles can create goals
  if (!GOAL_CREATOR_ROLES.has(role)) {
    throw ApiError.forbidden("You do not have permission to create goals");
  }

  // Only pure admins (tenant_owner/owner/tenant_admin) get auto-approved goals.
  // Managers, hr_managers, dept_heads, team_leads, employees → PENDING (needs admin/manager approval).
  const requiresApproval = !GOAL_AUTO_APPROVE_ROLES.has(role);
  const approvalOverride = requiresApproval
    ? { status: "PENDING" }
    : { status: "APPROVED" };

  const payload = {
    ...req.body,
    approval: { ...(req.body.approval ?? {}), ...approvalOverride },
  };

  const data = await service.createWorkGoal({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    actorMembershipId: req.membership?._id,
    payload,
    meta: meta(req),
  });
  res.status(201).json({ data });
});

export const listWorkGoals = asyncHandler(async (req, res) => {
  const query = applyDeptScope(req, { ...req.query });
  const data = await service.listWorkGoals({
    tenantId: req.tenant.id,
    query,
  });
  res.status(200).json(data);
});

export const getWorkGoal = asyncHandler(async (req, res) => {
  const data = await service.getWorkGoalById({
    tenantId: req.tenant.id,
    id: req.params.id,
  });
  res.status(200).json({ data });
});

export const updateWorkGoal = asyncHandler(async (req, res) => {
  if (isDepartmentHead(req)) {
    throw ApiError.forbidden("Department heads can only update goal status and add comments");
  }
  const role = normalizeRole(req);
  // Employees and team_leads can edit their own goals (ownership checked below)
  if (!GOAL_MANAGER_ROLES.has(role)) {
    const goal = await service.getWorkGoalById({ tenantId: req.tenant.id, id: req.params.id });
    if (!isGoalOwner(req, goal)) {
      throw ApiError.forbidden("You can only edit your own goals");
    }
  } else {
    assertCanManageGoals(req);
  }
  const data = await service.updateWorkGoal({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    actorMembershipId: req.membership?._id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const deleteWorkGoal = asyncHandler(async (req, res) => {
  const role = normalizeRole(req);
  // Employees and team_leads can delete their own PENDING goals
  if (!GOAL_MANAGER_ROLES.has(role)) {
    const goal = await service.getWorkGoalById({ tenantId: req.tenant.id, id: req.params.id });
    if (!isGoalOwner(req, goal)) {
      throw ApiError.forbidden("You can only delete your own goals");
    }
    if (goal?.approval?.status === "APPROVED") {
      throw ApiError.forbidden("Cannot delete an approved goal. Contact your manager.");
    }
  } else {
    assertCanManageGoals(req);
  }
  const data = await service.deleteWorkGoal({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    actorMembershipId: req.membership?._id,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const submitWorkGoal = asyncHandler(async (req, res) => {
  const data = await service.submitWorkGoal({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const approveWorkGoal = asyncHandler(async (req, res) => {
  const role = normalizeRole(req);
  if (!GOAL_APPROVER_ROLES.has(role)) {
    throw ApiError.forbidden("Only managers and department heads can approve goals");
  }
  const data = await service.approveWorkGoal({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const rejectWorkGoal = asyncHandler(async (req, res) => {
  const role = normalizeRole(req);
  if (!GOAL_APPROVER_ROLES.has(role)) {
    throw ApiError.forbidden("Only managers and department heads can reject goals");
  }
  const data = await service.rejectWorkGoal({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const carryForwardWorkGoals = asyncHandler(async (req, res) => {
  const data = await service.carryForwardWorkGoals({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    goalIds: req.body.goalIds,
    targetWeekCycleId: req.body.targetWeekCycleId,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const listGoalsByDepartment = asyncHandler(async (req, res) => {
  // Department-scoped users can only query their own department
  const scope = getDepartmentFilter(req);
  const requestedDeptId = req.params.deptId;
  if (scope.departmentId && String(scope.departmentId) !== String(requestedDeptId)) {
    return res.status(403).json({ message: "You can only view goals in your own department" });
  }

  const data = await service.listGoalsByDepartment({
    tenantId: req.tenant.id,
    departmentId: requestedDeptId,
    query: req.query,
  });
  res.status(200).json(data);
});

export const getCurrentWeekGoals = asyncHandler(async (req, res) => {
  const employeeMemberId =
    req.query?.employeeMemberId ?? String(req.departmentScope?.membershipId ?? "");
  const data = await service.listCurrentWeekGoals({
    tenantId: req.tenant.id,
    employeeMemberId: employeeMemberId || undefined,
    date: req.query?.date || new Date().toISOString().slice(0, 10),
  });
  res.status(200).json({ data });
});

export const getWorkGoalHistory = asyncHandler(async (req, res) => {
  const data = await service.getWorkGoalHistory({
    tenantId: req.tenant.id,
    id: req.params.id,
  });
  res.status(200).json({ data });
});

export const updateWorkGoalStatus = asyncHandler(async (req, res) => {
  const data = await service.updateWorkGoalStatus({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    status: req.body.status,
    reason: req.body.reason,
    comment: req.body.comment,
    meta: meta(req),
  });
  res.status(200).json({ data });
});
