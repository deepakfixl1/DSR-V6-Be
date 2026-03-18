/**
 * Requires a plan feature to be enabled (PlanCatalog.features + TenantFeature overrides).
 */

import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Tenant, PlanCatalog, TenantFeature } from "#db/models/index.js";

/**
 * Resolves tenantId from req.
 */
function getTenantIdFromRequest(req) {
  return req.tenantId ?? req.params?.tenantId ?? null;
}

/**
 * Returns whether the feature is enabled for the tenant (plan + overrides).
 * @param {string} tenantId
 * @param {string} featureKey
 * @returns {Promise<boolean>}
 */
async function isFeatureEnabled(tenantId, featureKey) {
  const tenant = await Tenant.findById(tenantId).select("planId").lean();
  if (!tenant?.planId) return false;

  const override = await TenantFeature.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    featureKey,
  }).lean();

  if (override !== null) {
    if (override.expiresAt && new Date() > override.expiresAt) return false;
    return !!override.enabled;
  }

  const plan = await PlanCatalog.findById(tenant.planId).lean();
  if (!plan?.features) return false;

  const value = plan.features[featureKey];
  return value === true;
}

/**
 * Middleware factory: requires feature to be enabled; 403 if disabled.
 * Use after requireTenantMembership so req.tenantId is set.
 * @param {string} featureKey - e.g. 'rbac', 'auditLogs', 'apiAccess'
 * @returns {import("express").RequestHandler}
 */
export function requireFeature(featureKey) {
  return async (req, _res, next) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      if (!tenantId) {
        return next(ApiError.badRequest("Tenant context required"));
      }

      const enabled = await isFeatureEnabled(tenantId, featureKey);
      if (!enabled) {
        return next(ApiError.forbidden(`Feature "${featureKey}" is not enabled for this plan`));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
