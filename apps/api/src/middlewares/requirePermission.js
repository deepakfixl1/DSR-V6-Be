import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { TenantMembership, Role } from "#db/models/index.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const resolveTenantId = (req) =>
  req.params?.tenantId ??
  req.headers?.["x-tenant-id"] ??
  req.body?.tenantId ??
  req.query?.tenantId ??
  null;

/**
 * RBAC middleware for tenant-scoped permissions.
 * Requires authenticated req.user and tenantId in params/body/query.
 * Owner bypass is allowed.
 * @param {string} permission
 * @returns {import("express").RequestHandler}
 */
export const requirePermission = (permission) => {
  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      const tenantId = resolveTenantId(req);

      if (!userId) return next(ApiError.unauthorized("Authentication required"));
      if (!tenantId || !objectIdRegex.test(String(tenantId))) {
        return next(ApiError.badRequest("Valid tenantId is required"));
      }

      const membership = await TenantMembership.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "active"
      }).lean();
      if (!membership) return next(ApiError.forbidden("Tenant membership required"));

      if (membership.isOwner) {
        req.tenantId = String(tenantId);
        req.membership = membership;
        return next();
      }

      const role = await Role.findById(membership.roleId).select("permissions").lean();
      const hasPermission = Array.isArray(role?.permissions) && role.permissions.includes(permission);
      if (!hasPermission) {
        return next(ApiError.forbidden(`Missing permission: ${permission}`));
      }

      req.tenantId = String(tenantId);
      req.membership = membership;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
