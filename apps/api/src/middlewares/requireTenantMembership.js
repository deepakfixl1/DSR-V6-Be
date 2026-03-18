/**
 * Tenant membership and owner middlewares.
 * Attach req.membership and enforce owner when required.
 */

import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { TenantMembership, User } from "#db/models/index.js";

/**
 * Resolves tenantId from req (params.tenantId).
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getTenantIdFromRequest(req) {
  return req.params?.tenantId ?? null;
}

/**
 * Middleware: requires user to have active membership; sets req.membership.
 * Platform admins bypass membership check and get virtual owner access.
 * @returns {import("express").RequestHandler}
 */
export function requireTenantMembership() {
  return async (req, _res, next) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      const userId = req.user?.id;
      if (!tenantId || !userId) {
        return next(ApiError.unauthorized("Authentication required"));
      }

      const user = await User.findById(userId).select("isPlatformAdmin").lean();
      if (user?.isPlatformAdmin) {
        req.membership = { isOwner: true, tenantId: new mongoose.Types.ObjectId(tenantId) };
        req.tenantId = tenantId;
        return next();
      }

      const membership = await TenantMembership.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "active",
      }).lean();

      if (!membership) {
        return next(ApiError.forbidden("Not a member of this tenant"));
      }

      req.membership = membership;
      req.tenantId = tenantId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Middleware: requires req.membership to be present and isOwner === true.
 * Must be used after requireTenantMembership().
 * @returns {import("express").RequestHandler}
 */
export function requireTenantOwner() {
  return (req, _res, next) => {
    if (!req.membership) {
      return next(ApiError.forbidden("Tenant membership required"));
    }
    if (!req.membership.isOwner) {
      return next(ApiError.forbidden("Tenant owner access required"));
    }
    return next();
  };
}
