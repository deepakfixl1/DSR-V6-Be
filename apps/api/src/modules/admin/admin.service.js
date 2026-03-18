import crypto from "node:crypto";
import mongoose from "mongoose";
import { Tenant, User, Subscription, AuditLog, TenantUsage } from "#db/models/index.js";
import { signAccessToken } from "#api/modules/auth/auth.tokens.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

/**
 * Extracts monthly amount from plan metadata if available.
 * @param {object} plan
 * @returns {number}
 */
function getPlanMonthlyAmount(plan) {
  if (!plan?.metadata) return 0;
  const amount = plan.metadata.monthlyAmount ?? plan.metadata.amount ?? 0;
  return typeof amount === "number" ? amount : 0;
}

/**
 * Fetches platform metrics aggregated from Tenant, User, Subscription.
 * @returns {Promise<{ totalTenants: number, totalUsers: number, activeSubscriptions: number, mrr: number, arr: number, platformHealth: object }>}
 */
export async function getMetrics() {
  const [totalTenants, totalUsers, activeSubscriptions, subscriptionsWithPlans] =
    await Promise.all([
      Tenant.countDocuments({ deletedAt: null }),
      User.countDocuments(),
      Subscription.countDocuments({ status: { $in: ACTIVE_SUBSCRIPTION_STATUSES } }),
      Subscription.find({ status: { $in: ACTIVE_SUBSCRIPTION_STATUSES } })
        .populate("planId")
        .lean()
    ]);

  let mrr = 0;
  for (const sub of subscriptionsWithPlans) {
    const plan = sub.planId;
    if (plan) {
      mrr += getPlanMonthlyAmount(plan);
    }
  }
  const arr = mrr * 12;

  const platformHealth = {
    tenantsActive: totalTenants > 0,
    subscriptionsHealthy: activeSubscriptions >= 0,
    lastChecked: new Date().toISOString()
  };

  return {
    totalTenants,
    totalUsers,
    activeSubscriptions,
    mrr,
    arr,
    platformHealth
  };
}

export async function listTenants() {
  return Tenant.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
}

export async function suspendTenantByAdmin(id, actorId) {
  const tenant = await Tenant.findById(id);
  if (!tenant) return null;
  tenant.status = "suspended";
  await tenant.save();

  await recordAudit({
    tenantId: tenant._id,
    actorId,
    entityType: "tenant",
    entityId: tenant._id,
    action: "admin_suspend",
    after: tenant.toObject(),
    meta: {},
  });

  return tenant.toObject();
}

export async function unsuspendTenantByAdmin(id, actorId) {
  const tenant = await Tenant.findById(id);
  if (!tenant) return null;
  tenant.status = "active";
  tenant.suspendedUntil = null;
  await tenant.save();

  await recordAudit({
    tenantId: tenant._id,
    actorId,
    entityType: "tenant",
    entityId: tenant._id,
    action: "admin_unsuspend",
    after: tenant.toObject(),
    meta: {},
  });

  return tenant.toObject();
}

export async function impersonateTenant(id, actorId) {
  const tenant = await Tenant.findById(id).lean();
  if (!tenant) return null;

  const owner = await User.findOne({ isPlatformAdmin: false }).lean();
  const token = signAccessToken({
    userId: String(owner?._id ?? actorId),
    sessionId: crypto.randomUUID(),
    jti: crypto.randomUUID(),
  });

  await recordAudit({
    tenantId: tenant._id,
    actorId,
    entityType: "tenant",
    entityId: tenant._id,
    action: "admin_impersonate",
    after: { impersonatedUserId: owner?._id ?? actorId },
    meta: {},
  });

  return { token, tenantId: tenant._id, impersonatedUserId: owner?._id ?? actorId };
}

export async function getPlatformStats() {
  const [metrics, tenantsByStatus, usage] = await Promise.all([
    getMetrics(),
    Tenant.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    TenantUsage.find().sort({ createdAt: -1 }).limit(12).lean(),
  ]);

  return {
    ...metrics,
    tenantStatuses: Object.fromEntries(tenantsByStatus.map((item) => [item._id, item.count])),
    latestUsageSnapshots: usage,
  };
}

export async function createBreakGlassAccess({ actorId, reason }) {
  const entry = await AuditLog.create({
    action: "BREAK_GLASS_GRANTED",
    resourceType: "AdminAccess",
    resourceId: new mongoose.Types.ObjectId(),
    userId: actorId,
    tenantId: null,
    diff: { reason },
    entityType: "admin_access",
    actorId,
    before: null,
    after: { reason, grantedAt: new Date().toISOString() },
    metadata: { reason },
  });

  return entry.toObject();
}

export async function getBreakGlassLog() {
  return AuditLog.find({ action: { $in: ["BREAK_GLASS_GRANTED", "BREAK_GLASS_REVOKED"] } })
    .sort({ createdAt: -1 })
    .lean();
}
