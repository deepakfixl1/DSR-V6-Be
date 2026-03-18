/**
 * Blocks non-GET requests when tenant has readOnlyMode.
 * Platform admins bypass this check.
 * Use after requireTenantMembership.
 */

import { ApiError } from "#api/utils/ApiError.js";
import { Tenant, User } from "#db/models/index.js";

export function requireTenantNotReadOnly() {
  return async (req, _res, next) => {
    try {
      if (req.method === "GET" || req.method === "HEAD") {
        return next();
      }

      const tenantId = req.params?.tenantId ?? req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        return next();
      }

      const user = await User.findById(userId).select("isPlatformAdmin").lean();
      if (user?.isPlatformAdmin) {
        return next();
      }

      const tenant = await Tenant.findById(tenantId)
        .select("readOnlyMode readOnlyUntil")
        .lean();
      const now = new Date();
      const isReadOnly =
        tenant?.readOnlyMode === true ||
        (tenant?.readOnlyUntil && new Date(tenant.readOnlyUntil) > now);
      if (isReadOnly) {
        return next(
          ApiError.forbidden(
            "Tenant is in read-only mode. Create, update, and delete operations are disabled."
          )
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
