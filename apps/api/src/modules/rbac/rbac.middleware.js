import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { TenantMembership, Role } from "#db/models/index.js";
import { ALL_PERMISSIONS } from "./permissions.js";

const WILDCARD_PERMISSION = "*";

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const toObjectId = (value, fieldName = "id") => {
  if (!isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(String(value));
};

const isKnownPermission = (permission) => {
  return permission === WILDCARD_PERMISSION || ALL_PERMISSIONS.includes(permission);
};

const normalizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter(Boolean))];
};

const hasPermission = (permissions = [], permission) => {
  if (!Array.isArray(permissions) || !permission) return false;
  if (permissions.includes(WILDCARD_PERMISSION)) return true;
  return permissions.includes(permission);
};

const hasAnyPermission = (grantedPermissions = [], requiredPermissions = []) => {
  if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return false;
  if (grantedPermissions.includes(WILDCARD_PERMISSION)) return true;
  return requiredPermissions.some((permission) => grantedPermissions.includes(permission));
};

const hasAllPermissions = (grantedPermissions = [], requiredPermissions = []) => {
  if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return false;
  if (grantedPermissions.includes(WILDCARD_PERMISSION)) return true;
  return requiredPermissions.every((permission) => grantedPermissions.includes(permission));
};

const resolvePermissions = async ({ membership }) => {
  if (!membership) {
    return { roleName: "Unknown", permissions: [] };
  }

  // owner shortcut
  if (membership.isOwner) {
    return {
      roleName: "Tenant Owner",
      permissions: [WILDCARD_PERMISSION],
    };
  }

  if (!membership.roleId) {
    return {
      roleName: "Unassigned",
      permissions: [],
    };
  }

  const role = await Role.findById(membership.roleId)
    .select("name permissions isPlatformRole")
    .lean();

  if (!role) {
    return {
      roleName: "Unknown",
      permissions: [],
    };
  }

  return {
    roleName: role.name ?? "Unknown",
    permissions: normalizePermissions(role.permissions),
    isPlatformRole: Boolean(role.isPlatformRole),
    roleId: role._id,
  };
};

const loadRbacContext = async (req) => {
  if (req.rbac?.permissions && req.membership) {
    return {
      membership: req.membership,
      rbac: req.rbac,
    };
  }

  const userId = req.user?.id ?? req.user?._id;
  const tenantId = req.tenant?.id ?? req.tenant?._id ?? req.tenantId;

  if (!userId) {
    throw ApiError.unauthorized("Authentication required");
  }

  if (!tenantId) {
    throw ApiError.badRequest("Valid tenantId is required");
  }

  const membership = await TenantMembership.findOne({
    tenantId: toObjectId(tenantId, "tenantId"),
    userId: toObjectId(userId, "userId"),
    status: "active",
  })
    .select("tenantId userId roleId status isOwner teamId departmentId")
    .lean();

  if (!membership) {
    throw ApiError.forbidden("Tenant membership required");
  }

  const resolved = await resolvePermissions({ membership });

  req.membership = membership;
  req.rbac = {
    roleName: resolved.roleName,
    roleId: resolved.roleId ?? membership.roleId ?? null,
    isPlatformRole: Boolean(resolved.isPlatformRole),
    permissions: normalizePermissions(resolved.permissions),
  };

  return {
    membership,
    rbac: req.rbac,
  };
};

const validateRequestedPermissions = (permissions = []) => {
  for (const permission of permissions) {
    if (!isKnownPermission(permission)) {
      throw ApiError.internal(`Unknown permission used in middleware: ${permission}`);
    }
  }
};

export const requirePermission = (permission) => async (req, _res, next) => {
  try {
    validateRequestedPermissions([permission]);

    const { rbac } = await loadRbacContext(req);

    if (!hasPermission(rbac.permissions, permission)) {
      return next(ApiError.forbidden(`Missing permission: ${permission}`));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAnyPermission = (permissions = []) => async (req, _res, next) => {
  try {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return next(ApiError.badRequest("At least one permission is required"));
    }

    validateRequestedPermissions(permissions);

    const { rbac } = await loadRbacContext(req);

    if (!hasAnyPermission(rbac.permissions, permissions)) {
      return next(
        ApiError.forbidden(`Missing any of permissions: ${permissions.join(", ")}`)
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAllPermissions = (permissions = []) => async (req, _res, next) => {
  try {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return next(ApiError.badRequest("At least one permission is required"));
    }

    validateRequestedPermissions(permissions);

    const { rbac } = await loadRbacContext(req);

    if (!hasAllPermissions(rbac.permissions, permissions)) {
      return next(
        ApiError.forbidden(`Missing required permissions: ${permissions.join(", ")}`)
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const attachRbac = () => async (req, _res, next) => {
  try {
    await loadRbacContext(req);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const hasPermissionInRequest = (req, permission) => {
  if (!isKnownPermission(permission)) return false;
  return hasPermission(req.rbac?.permissions ?? [], permission);
};

export const hasAnyPermissionInRequest = (req, permissions = []) => {
  return hasAnyPermission(req.rbac?.permissions ?? [], permissions);
};

export const hasAllPermissionsInRequest = (req, permissions = []) => {
  return hasAllPermissions(req.rbac?.permissions ?? [], permissions);
};

export const getRequestRoleName = (req) => {
  return req.rbac?.roleName ?? null;
};

export const getRequestPermissions = (req) => {
  return req.rbac?.permissions ?? [];
};