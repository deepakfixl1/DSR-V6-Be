/**
 * Requires tenant subscription to be in an active state (not past_due, canceled, unpaid).
 */

import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Subscription } from "#db/models/index.js";

const BLOCKED_STATUSES = ["past_due", "canceled", "unpaid"];

/**
 * Resolves tenantId from req (params.tenantId or req.tenantId set by requireTenantMembership).
 */
function getTenantIdFromRequest(req) {
  return req.tenantId ?? req.params?.tenantId ?? null;
}

/**
 * Middleware: blocks if subscription status is past_due, canceled, or unpaid.
 * Requires tenantId in params (use after requireTenantMembership).
 * @returns {import("express").RequestHandler}
 */
export function requireSubscriptionActive() {
  return async (req, _res, next) => {
    try {
      const tenantId = getTenantIdFromRequest(req);
      if (!tenantId) {
        return next(ApiError.badRequest("Tenant context required"));
      }

      const subscription = await Subscription.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
      }).lean();

      if (!subscription) {
        return next(ApiError.forbidden("No active subscription"));
      }

      if (BLOCKED_STATUSES.includes(subscription.status)) {
        return next(
          ApiError.forbidden(
            `Subscription is ${subscription.status}. Please update your billing to continue.`
          )
        );
      }

      req.subscription = subscription;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
