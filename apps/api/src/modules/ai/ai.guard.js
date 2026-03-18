import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { Tenant, PlanCatalog, TenantMembership, Role, AIUsage, User } from "#db/models/index.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { cacheKeys } from "#infra/cache/keys.js";
import { config } from "#api/config/env.js";
import { AI_FEATURES, AI_LIMITS } from "./ai.model.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const PLAN_MATRIX = Object.freeze({
  free: {
    [AI_FEATURES.summary]: true,
    [AI_FEATURES.report]: false,
    [AI_FEATURES.risk]: false,
    [AI_FEATURES.forecast]: false,
    [AI_FEATURES.security]: false,
    [AI_FEATURES.recommendation]: false,
    [AI_FEATURES.assistant]: false,
    [AI_FEATURES.auditSearch]: true,
    [AI_FEATURES.dashboardAnomaly]: false
  },
  pro: {
    [AI_FEATURES.summary]: true,
    [AI_FEATURES.report]: true,
    [AI_FEATURES.risk]: true,
    [AI_FEATURES.forecast]: false,
    [AI_FEATURES.security]: false,
    [AI_FEATURES.recommendation]: true,
    [AI_FEATURES.assistant]: false,
    [AI_FEATURES.auditSearch]: true,
    [AI_FEATURES.dashboardAnomaly]: true
  },
  enterprise: {
    [AI_FEATURES.summary]: true,
    [AI_FEATURES.report]: true,
    [AI_FEATURES.risk]: true,
    [AI_FEATURES.forecast]: true,
    [AI_FEATURES.security]: true,
    [AI_FEATURES.recommendation]: true,
    [AI_FEATURES.assistant]: true,
    [AI_FEATURES.auditSearch]: true,
    [AI_FEATURES.dashboardAnomaly]: true
  }
});

const resolveTenantId = (req) =>
  req.params?.tenantId ?? req.body?.tenantId ?? req.query?.tenantId ?? null;

const checkRateLimit = async ({ tenantId, userId, feature }) => {
  const redis = getRedisClient();
  if (!redis) return true;
  const key = cacheKeys.buildKey({
    env: config.app.env,
    scope: "t",
    tenantId,
    module: "ai",
    type: "rate",
    id: [feature, userId],
    clusterTenantTag: true
  });
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60);
  }
  return current <= AI_LIMITS.rateLimitPerMinute;
};

const checkTokenLimit = async ({ tenantId, maxTokens }) => {
  if (!maxTokens || maxTokens <= 0) return true;
  const now = new Date();
  const monthKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usage = await AIUsage.findOne({ tenantId, monthKey }).lean();
  if (!usage) return true;
  return usage.tokensUsed < maxTokens;
};

export const aiGuard = ({ feature, permission = null } = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const tenantId = resolveTenantId(req);
      if (!userId) return next(ApiError.unauthorized("Authentication required"));
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId) {
        const user = await User.findById(userId).select("defaultTeanant").lean();
        resolvedTenantId = user?.defaultTeanant ? String(user.defaultTeanant) : null;
      }
      if (!resolvedTenantId || !objectIdRegex.test(String(resolvedTenantId))) {
        return next(ApiError.badRequest("Valid tenantId is required"));
      }

      const membership = await TenantMembership.findOne({
        tenantId: new mongoose.Types.ObjectId(resolvedTenantId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "active"
      }).lean();
      if (!membership) return next(ApiError.forbidden("Tenant membership required"));

      let permissions = [];
      if (!membership.isOwner) {
        const role = await Role.findById(membership.roleId).select("permissions").lean();
        permissions = Array.isArray(role?.permissions) ? role.permissions : [];
        if (permission && !permissions.includes(permission)) {
          return next(ApiError.forbidden(`Missing permission: ${permission}`));
        }
      }

      const tenant = await Tenant.findById(resolvedTenantId).lean();
      const plan = tenant?.planId
        ? await PlanCatalog.findById(tenant.planId).lean()
        : await PlanCatalog.findOne({ planCode: "free" }).lean();
      const planCode = plan?.planCode || "free";
      const planLimits = plan?.limits || {};

      const matrix = PLAN_MATRIX[planCode] || PLAN_MATRIX.free;
      const allowedForPlan = !feature || matrix[feature] === true;
      if (!allowedForPlan) {
        return next(ApiError.forbidden("AI feature not available on current plan"));
      }

      const withinRateLimit = await checkRateLimit({
        tenantId: resolvedTenantId,
        userId,
        feature: feature || "ai"
      });
      if (!withinRateLimit) {
        return res.status(429).json({ status: "limit_exceeded" });
      }

      const withinTokenLimit = await checkTokenLimit({
        tenantId: resolvedTenantId,
        maxTokens: planLimits.maxAITokensPerMonth
      });
      if (!withinTokenLimit) {
        return res.status(429).json({ status: "limit_exceeded" });
      }

      req.tenantId = String(resolvedTenantId);
      req.aiContext = {
        tenantId: String(resolvedTenantId),
        userId: String(userId),
        planCode,
        planLimits,
        membership,
        permissions
      };
      req.user = {
        ...req.user,
        tenantId: String(resolvedTenantId),
        planCode,
        planLimits
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
