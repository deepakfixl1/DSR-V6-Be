/**
 * Allows audit log access for:
 *  - Platform admins (isPlatformAdmin)
 *  - Tenant owners (isOwner)
 *  - Tenant admins / HR managers (role-based)
 *  - Anyone with "audit:read" permission
 *
 * Falls back to platform-admin check when no tenant context is available.
 */

import { User } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";

const AUDIT_ROLES = new Set(["tenant_owner", "tenant_admin", "hr_manager", "owner"]);

export const requireAuditAccess = () => {
  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(ApiError.unauthorized("Unauthorized"));

      // Platform admins always allowed
      const user = await User.findById(userId).select("isPlatformAdmin").lean();
      if (user?.isPlatformAdmin) return next();

      // Tenant context available (from resolveTenant + attachRbac)
      const membership = req.membership;
      if (membership) {
        if (membership.isOwner) return next();

        const roleName = (req.rbac?.roleName ?? "").toLowerCase().replace(/\s+/g, "_");
        if (AUDIT_ROLES.has(roleName)) return next();

        const permissions = req.rbac?.permissions ?? [];
        if (permissions.includes("audit:read") || permissions.includes("*")) return next();
      }

      return next(ApiError.forbidden("Audit access required"));
    } catch (error) {
      return next(error);
    }
  };
};
