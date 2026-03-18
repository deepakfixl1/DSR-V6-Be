/**
 * Enforces plan limits using TenantUsage for current month vs PlanCatalog.limits.
 */

import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Tenant, TenantUsage, PlanCatalog } from "#db/models/index.js";

/**
 * Resolves tenantId from req.
 */
function getTenantIdFromRequest(req) {
  return req.tenantId ?? req.params?.tenantId ?? null;
}

/**
 * Returns current month key YYYYMM.
 */
function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/** Map limitKey to TenantUsage field and PlanCatalog.limits field. */
const LIMIT_MAP = {
  maxUsers: { usageField: "activeUsers", planField: "maxUsers" },
  maxApiCallsPerMonth: { usageField: "apiCalls", planField: "maxApiCallsPerMonth" },
  maxStorageGB: { usageField: "storageBytes", planField: "maxStorageGB" },
};

/**
 * Middleware factory: enforces plan limit for current month; 403 if exceeded.
 * Use after requireTenantMembership.
 * @param {string} limitKey - one of 'maxUsers' | 'maxApiCallsPerMonth' | 'maxStorageGB'
 * @returns {import("express").RequestHandler}
 */
export function enforceLimit(limitKey) {
  const mapping = LIMIT_MAP[limitKey];
  if (!mapping) {
    throw new Error(`Unknown limitKey: ${limitKey}`);
  }

  return async (req, _res, next) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      if (!tenantId) {
        return next(ApiError.badRequest("Tenant context required"));
      }

      const tenant = await Tenant.findById(tenantId).select("planId").lean();
      if (!tenant?.planId) {
        return next(ApiError.forbidden("No plan assigned"));
      }

      const plan = await PlanCatalog.findById(tenant.planId).lean();
      const maxAllowed = plan?.limits?.[mapping.planField];
      if (maxAllowed == null) {
        return next();
      }

      const monthKey = getCurrentMonthKey();
      let usage = await TenantUsage.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        monthKey,
      }).lean();

      if (!usage) {
        usage = {
          activeUsers: 0,
          apiCalls: 0,
          storageBytes: 0,
        };
      }

      let current = usage[mapping.usageField] ?? 0;
      if (limitKey === "maxStorageGB") {
        current = Math.ceil((current || 0) / (1024 * 1024 * 1024));
      }

      if (current >= maxAllowed) {
        return next(
          ApiError.forbidden(
            `Plan limit reached for ${limitKey}. Upgrade your plan to continue.`
          )
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
