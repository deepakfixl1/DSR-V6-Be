/**
 * Department Scope Middleware
 *
 * Runs AFTER RBAC middleware (attachRbac / requirePermission).
 * Reads req.membership and req.rbac to determine the user's department scope,
 * then attaches `req.departmentScope` for downstream controllers/services.
 *
 * Scope levels:
 *   "self"       — employee: can only see own data
 *   "department"  — manager / department_head: can see entire department
 *   "tenant"      — owner / admin / hr / auditor / analyst / reviewer: tenant-wide
 */

import { ApiError } from "#api/utils/ApiError.js";
import { Role } from "#db/models/index.js";

// ── Role names that are department-scoped ──────────────────────────────────
// These must match the `name` field in the Role collection (case-insensitive).
// The normalise() helper lowercases + trims before comparison.
const SELF_SCOPED_ROLES = new Set([
  "employee",
]);

const DEPARTMENT_SCOPED_ROLES = new Set([
  "manager",
  "team_lead",
  "team manager",
  "team_manager",
  "department_head",
  "department head",
]);

// Normalise the DB role name for comparison (lowercase, trimmed).
const normalise = (name) => (name ?? "").toLowerCase().trim();

/**
 * Determine scope level from role name.
 * @returns {"self" | "department" | "tenant"}
 */
function resolveScopeLevel(roleName, isOwner, isPlatformRole) {
  if (isOwner || isPlatformRole) return "tenant";

  const key = normalise(roleName);
  if (SELF_SCOPED_ROLES.has(key)) return "self";
  if (DEPARTMENT_SCOPED_ROLES.has(key)) return "department";

  // Any other role (tenant admin, hr manager, auditor, reviewer,
  // read only analyst, etc.) gets tenant-wide visibility.
  return "tenant";
}

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * Express middleware — attaches `req.departmentScope`.
 *
 * Must be used AFTER `attachRbac()` or any `requirePermission()` call so that
 * `req.membership` and `req.rbac` are populated.
 *
 * If a department-scoped user has no departmentId, responds with 403.
 */
export const attachDepartmentScope = () => async (req, _res, next) => {
  try {
    const membership = req.membership;

    if (!membership) {
      return next(
        ApiError.internal("departmentScope middleware requires membership context")
      );
    }

    // Resolve role name — prefer req.rbac (set by RBAC middleware), fall back
    // to loading the role directly from the membership document.
    let roleName = req.rbac?.roleName ?? null;
    let isPlatformRole = req.rbac?.isPlatformRole ?? false;

    if (!roleName && membership.roleId) {
      const role = await Role.findById(membership.roleId).select("name isPlatformRole").lean();
      roleName = role?.name ?? null;
      isPlatformRole = Boolean(role?.isPlatformRole);
    }

    const scopeLevel = resolveScopeLevel(
      roleName,
      membership.isOwner,
      isPlatformRole
    );

    const isDepartmentScoped = scopeLevel !== "tenant";
    const departmentId = membership.departmentId ?? null;

    // Block department-scoped users who have no department assigned.
    if (isDepartmentScoped && !departmentId) {
      return next(
        ApiError.forbidden(
          "You must be assigned to a department before you can access this resource. Please contact your admin."
        )
      );
    }

    req.departmentScope = {
      isDepartmentScoped,
      departmentId,
      membershipId: membership._id,
      scopeLevel,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

// ── Helper for controllers / services ──────────────────────────────────────

/**
 * Build a MongoDB-style filter object based on the resolved department scope.
 *
 * Usage in a controller:
 *   const deptFilter = getDepartmentFilter(req);
 *   // deptFilter is one of:
 *   //   {}                                        — tenant-wide (no restriction)
 *   //   { departmentId: <ObjectId> }              — department-scoped
 *   //   { employeeMemberId: <ObjectId> }          — self-scoped (employee)
 *
 * The consuming service must interpret `employeeMemberId` to filter records
 * where the record owner / submitter matches the user's membership id.
 *
 * @param {import("express").Request} req
 * @returns {{ departmentId?: import("mongoose").Types.ObjectId, employeeMemberId?: import("mongoose").Types.ObjectId }}
 */
export function getDepartmentFilter(req) {
  const scope = req.departmentScope;

  // No scope attached (middleware not run) or tenant-wide → no filter.
  if (!scope || !scope.isDepartmentScoped) {
    return {};
  }

  if (scope.scopeLevel === "self") {
    return { employeeMemberId: scope.membershipId };
  }

  // "department" scope — manager / department_head
  return { departmentId: scope.departmentId };
}

/**
 * Quick boolean check — is the current request department-scoped?
 */
export function isDepartmentScoped(req) {
  return Boolean(req.departmentScope?.isDepartmentScoped);
}
