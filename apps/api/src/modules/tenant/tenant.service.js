/**
 * Tenant service. All tenant and settings business logic; DB, Redis, audit, notifications.
 */

import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  Tenant,
  TenantMembership,
  TenantSettings,
  TenantUsage,
  PlanCatalog,
  Subscription,
  Role,
  User,
  PendingTenantInvite,
} from "#db/models/index.js";
import * as auditService from "#api/modules/audit/audit.service.js";
import * as notificationService from "#api/modules/notification/notification.service.js";
import { enqueueTenantOwnerInviteEmail } from "#infra/queue/email.queue.js";
import { setTenantOwnerInviteToken } from "#api/modules/auth/auth.redis.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { config } from "#api/config/env.js";

const env = config.app.env;
const FREE_PLAN_CODE = "free";
const INVITE_EXPIRY_DAYS = 7;

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Adds duration to a date. Used for subscription period end.
 * @param {Date} start
 * @param {string} duration - 'weekly' | 'monthly' | 'quarterly' | 'yearly'
 * @returns {Date}
 */
function addDuration(start, duration) {
  const d = new Date(start);
  switch (duration) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
    default:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/**
 * Fetches the free plan from PlanCatalog.
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getFreePlan() {
  const plan = await PlanCatalog.findOne({
    planCode: FREE_PLAN_CODE,
    isActive: true,
  }).lean();
  return plan;
}

/**
 * Ensures Owner role exists (platform role); creates if not.
 * @returns {Promise<import('mongoose').Document>}
 */
async function ensureOwnerRole() {
  let role = await Role.findOne({ name: "Owner" }).lean();
  if (!role) {
    const created = await Role.create({
      name: "Owner",
      description: "Tenant owner with full access",
      isPlatformRole: true,
      permissions: [],
    });
    role = created.toObject();
    logger.info({ roleId: created._id }, "Owner role created");
  }
  return role;
}

/**
 * Creates a pending tenant invite. Owner must accept (set password) to create the tenant.
 * @param {object} input
 * @param {string} input.name - tenant name
 * @param {string} input.slug
 * @param {string} input.ownerEmail
 * @param {string} [input.ownerName]
 * @param {string} [input.planId]
 * @param {object} [input.metadata]
 * @param {string} userId - inviter (super admin)
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function createTenant(input, userId, ctx = {}) {
  const slug = input.slug.toLowerCase().trim();
  const existingTenant = await Tenant.findOne({ slug }).lean();
  if (existingTenant) {
    throw ApiError.conflict("Tenant slug already exists");
  }
  const existingPending = await PendingTenantInvite.findOne({ slug, status: "pending" }).lean();
  if (existingPending) {
    throw ApiError.conflict("A pending invite already exists for this slug");
  }

  const freePlan = await getFreePlan();
  if (!freePlan) {
    logger.error({ FREE_PLAN_CODE }, "Free plan not found in PlanCatalog");
    throw ApiError.serviceUnavailable("Free plan not configured");
  }

  let planId = freePlan._id;
  if (input.planId) {
    const plan = await PlanCatalog.findOne({ _id: input.planId, isActive: true }).lean();
    if (!plan) throw ApiError.badRequest("Invalid planId");
    planId = plan._id;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await PendingTenantInvite.create({
    ownerEmail: input.ownerEmail.toLowerCase().trim(),
    ownerName: (input.ownerName || "").trim(),
    tenantName: input.name.trim(),
    slug,
    planId,
    invitedBy: new mongoose.Types.ObjectId(userId),
    tokenHash,
    expiresAt,
    status: "pending",
    metadata: input.metadata ?? {},
  });

  await setTenantOwnerInviteToken(token, String(invite._id));

  const tenantPlatformUrl = config.app.tenantPlatformUrl || "http://localhost:5175";
  const setPasswordLink = `${tenantPlatformUrl}/accept-tenant-invite?token=${encodeURIComponent(token)}`;

  const inviter = await User.findById(userId).select("name").lean();
  try {
    await enqueueTenantOwnerInviteEmail({
      to: invite.ownerEmail,
      ownerName: invite.ownerName || undefined,
      tenantName: invite.tenantName,
      inviterName: inviter?.name ?? "An administrator",
      setPasswordLink,
      expiresInDays: INVITE_EXPIRY_DAYS,
    });
  } catch (err) {
    logger.warn({ err, inviteId: invite._id }, "Tenant owner invite email enqueue failed");
  }

  await auditService
    .log({
      action: "TENANT_INVITE_CREATED",
      resourceType: "PendingTenantInvite",
      resourceId: invite._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: null,
      diff: { tenantName: invite.tenantName, slug: invite.slug, ownerEmail: invite.ownerEmail },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ inviteId: invite._id, slug, ownerEmail: invite.ownerEmail }, "Tenant owner invite created");
  return {
    pendingInvite: {
      id: invite._id,
      tenantName: invite.tenantName,
      slug: invite.slug,
      ownerEmail: invite.ownerEmail,
      ownerName: invite.ownerName || null,
      expiresAt: invite.expiresAt,
    },
  };
}

/**
 * Resend tenant-owner invite email. Platform admin only.
 * @param {string} inviteId
 * @param {string} userId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function reinviteTenantInvite(inviteId, userId, ctx = {}) {
  const invite = await PendingTenantInvite.findOne({
    _id: new mongoose.Types.ObjectId(inviteId),
    status: "pending",
  });
  if (!invite) throw ApiError.notFound("Pending invite not found or already accepted");

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  await PendingTenantInvite.updateOne(
    { _id: invite._id },
    { $set: { tokenHash, expiresAt } }
  );
  await setTenantOwnerInviteToken(token, String(invite._id));

  const tenantPlatformUrl = config.app.tenantPlatformUrl || "http://localhost:5175";
  const setPasswordLink = `${tenantPlatformUrl}/accept-tenant-invite?token=${encodeURIComponent(token)}`;

  const inviter = await User.findById(userId).select("name").lean();
  try {
    await enqueueTenantOwnerInviteEmail({
      to: invite.ownerEmail,
      ownerName: invite.ownerName || undefined,
      tenantName: invite.tenantName,
      inviterName: inviter?.name ?? "An administrator",
      setPasswordLink,
      expiresInDays: INVITE_EXPIRY_DAYS,
    });
  } catch (err) {
    logger.warn({ err, inviteId: invite._id }, "Tenant owner reinvite email enqueue failed");
  }
  logger.info({ inviteId: invite._id }, "Tenant owner invite resent");
  return { message: "Invitation resent", expiresAt };
}

/**
 * Internal: creates Tenant + Subscription + Owner membership + settings + usage.
 * Used when owner accepts invite (auth.service).
 * @param {import('mongoose').Document} inviteDoc - PendingTenantInvite (accepted)
 * @param {string} ownerUserId - User._id of the owner
 * @returns {Promise<object>} tenant
 */
export async function createTenantFromInvite(inviteDoc, ownerUserId) {
  const slug = inviteDoc.slug;
  const initialPlan = await PlanCatalog.findById(inviteDoc.planId).lean();
  if (!initialPlan) {
    throw ApiError.serviceUnavailable("Plan not found");
  }
  const ownerRole = await ensureOwnerRole();
  const ownerRoleId = ownerRole._id;
  const userObjectId = new mongoose.Types.ObjectId(ownerUserId);

  const [tenant] = await Tenant.create([
    {
      name: inviteDoc.tenantName,
      slug,
      status: "active",
      planId: initialPlan._id,
      stripeCustomerId: null,
      metadata: inviteDoc.metadata ?? {},
    },
  ]);

  const tenantId = tenant._id;
  const now = new Date();
  const duration = initialPlan.duration || "yearly";
  const periodEnd = addDuration(now, duration);

  await Subscription.create({
    tenantId,
    stripeSubscriptionId: undefined,
    stripeCustomerId: null,
    planId: initialPlan._id,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  });

  await TenantMembership.create({
    tenantId,
    userId: userObjectId,
    roleId: ownerRoleId,
    status: "active",
    joinedAt: now,
    isOwner: true,
  });

  const defaultCategories = [
    { key: "branding", value: {}, category: "branding" },
    { key: "security", value: {}, category: "security" },
    { key: "notifications", value: {}, category: "notifications" },
  ];
  await TenantSettings.insertMany(
    defaultCategories.map(({ key, value, category }) => ({
      tenantId,
      key,
      value,
      category,
    }))
  );

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}${month}`;
  await TenantUsage.create({
    tenantId,
    monthKey,
    activeUsers: 1,
    apiCalls: 0,
    storageBytes: 0,
  });

  await notificationService
    .createNotification({
      userId: userObjectId,
      tenantId,
      type: "tenant_created",
      title: "Workspace created",
      body: `Workspace "${tenant.name}" is ready. You are the owner.`,
      link: `/tenants/${tenantId}`,
      priority: "normal",
      payload: { tenantId: String(tenantId), name: tenant.name },
    })
    .catch((err) => logger.warn({ err }, "Notification create failed"));

  logger.info({ tenantId, ownerUserId, slug }, "Tenant created from invite");
  return tenant.toObject();
}

/**
 * Returns tenant details if user has active membership or is platform admin.
 * Auto-activates tenant if suspended and suspendedUntil has passed.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getTenant(tenantId, userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: userObjectId,
      status: "active",
    }).lean();
    if (!membership) {
      throw ApiError.forbidden("Not a member of this tenant");
    }
  }

  let tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  if (
    tenant.status === "suspended" &&
    tenant.suspendedUntil &&
    tenant.suspendedUntil <= new Date()
  ) {
    tenant.status = "active";
    tenant.suspendedUntil = null;
    await tenant.save();
  }

  const now = new Date();
  if (
    (tenant.readOnlyMode || tenant.readOnlyUntil) &&
    tenant.readOnlyUntil &&
    tenant.readOnlyUntil <= now
  ) {
    tenant.readOnlyMode = false;
    tenant.readOnlyUntil = null;
    await tenant.save();
  }

  return tenant.toObject ? tenant.toObject() : tenant;
}

/**
 * Updates tenant name, metadata, status, suspendedUntil, readOnlyMode. Owner or platform admin only.
 * @param {string} tenantId
 * @param {object} input
 * @param {string} [input.name]
 * @param {object} [input.metadata]
 * @param {string} [input.status] - 'active' | 'suspended' | 'trial'
 * @param {Date|null} [input.suspendedUntil] - when set with status=suspended, auto-activates after this date
 * @param {boolean} [input.readOnlyMode] - when true, tenant users can only view (no CRUD)
 * @param {string} userId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function updateTenant(tenantId, userId, input, ctx = {}) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: userObjectId,
      status: "active",
      isOwner: true,
    });
    if (!membership) {
      throw ApiError.forbidden("Tenant owner access required");
    }
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  const diff = {};
  if (input.name !== undefined) {
    diff.name = { from: tenant.name, to: input.name };
    tenant.name = input.name.trim();
  }
  if (input.metadata !== undefined) {
    diff.metadata = input.metadata;
    tenant.metadata = input.metadata;
  }
  if (input.status !== undefined) {
    diff.status = { from: tenant.status, to: input.status };
    tenant.status = input.status;
    if (input.status === "active") {
      tenant.suspendedUntil = null;
    }
  }
  if (input.suspendedUntil !== undefined) {
    diff.suspendedUntil = { from: tenant.suspendedUntil, to: input.suspendedUntil };
    tenant.suspendedUntil = input.suspendedUntil;
  }
  if (input.readOnlyMode !== undefined) {
    diff.readOnlyMode = { from: tenant.readOnlyMode, to: input.readOnlyMode };
    tenant.readOnlyMode = input.readOnlyMode;
  }
  if (input.readOnlyUntil !== undefined) {
    diff.readOnlyUntil = { from: tenant.readOnlyUntil, to: input.readOnlyUntil };
    tenant.readOnlyUntil = input.readOnlyUntil;
  }
  await tenant.save();

  await auditService
    .log({
      action: "TENANT_UPDATED",
      resourceType: "Tenant",
      resourceId: tenant._id,
      userId: userObjectId,
      tenantId: tenant._id,
      diff,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, userId }, "Tenant updated");
  return tenant.toObject();
}

/**
 * Soft-suspends tenant. Owner only.
 * @param {string} tenantId
 * @param {string} userId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function suspendTenant(tenantId, userId, ctx = {}) {
  const membership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(userId),
    status: "active",
    isOwner: true,
  });
  if (!membership) {
    throw ApiError.forbidden("Tenant owner access required");
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }
  const previousStatus = tenant.status;
  tenant.status = "suspended";
  await tenant.save();

  await auditService
    .log({
      action: "TENANT_SUSPENDED",
      resourceType: "Tenant",
      resourceId: tenant._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: tenant._id,
      diff: { status: { from: previousStatus, to: "suspended" } },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, userId }, "Tenant suspended");
  return tenant.toObject();
}

/**
 * Returns structured settings for tenant (membership required, or platform admin).
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getSettings(tenantId, userId) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
    }).lean();
    if (!membership) {
      throw ApiError.forbidden("Not a member of this tenant");
    }
  }

  const docs = await TenantSettings.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).lean();

  const settings = {
    branding: {},
    security: {},
    notifications: {},
  };
  for (const d of docs) {
    if (d.category === "branding") settings.branding[d.key] = d.value;
    else if (d.category === "security") settings.security[d.key] = d.value;
    else if (d.category === "notifications") settings.notifications[d.key] = d.value;
  }
  return settings;
}

/**
 * Updates tenant settings. Owner or platform admin. Allowed categories: branding, security, notifications.
 * @param {string} tenantId
 * @param {object} input
 * @param {object} [input.branding]
 * @param {object} [input.security]
 * @param {object} [input.notifications]
 * @param {string} userId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function updateSettings(tenantId, userId, input, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    });
    if (!membership) {
      throw ApiError.forbidden("Tenant owner access required");
    }
  }

  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const diff = {};

  for (const category of ["branding", "security", "notifications"]) {
    const value = input[category];
    if (value === undefined || typeof value !== "object") continue;
    for (const [key, val] of Object.entries(value)) {
      await TenantSettings.findOneAndUpdate(
        { tenantId: tenantObjectId, key, category },
        { $set: { value: val } },
        { upsert: true, new: true }
      );
      diff[category] = diff[category] || {};
      diff[category][key] = val;
    }
  }

  await auditService
    .log({
      action: "SETTINGS_UPDATED",
      resourceType: "TenantSettings",
      resourceId: null,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: tenantObjectId,
      diff,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, userId }, "Settings updated");
  return getSettings(tenantId, userId);
}

export async function getSettingsSection(tenantId, userId, section) {
  const settings = await getSettings(tenantId, userId);
  return settings?.[section] ?? {};
}

export async function updateSettingsSection(tenantId, userId, category, payload, ctx = {}) {
  return updateSettings(
    tenantId,
    userId,
    { [category]: payload },
    ctx
  );
}

export async function getUserTenants(userId, opts = {}) {
  const { search, status, page = 1, limit = 20 } = opts;

  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  let tenantIds = null;
  let memberships = [];
  if (!isPlatformAdmin) {
    memberships = await TenantMembership.find({
      userId,
      status: "active"
    })
      .select("tenantId role")
      .lean();
    if (!memberships.length) return { data: [], total: 0, statusCounts: { active: 0, trial: 0, suspended: 0, invited: 0 } };
    tenantIds = memberships.map(m => m.tenantId);
  }

  // Platform admin can see "invited" (pending) tenants
  if (isPlatformAdmin && status === "invited") {
    const pendingFilter = { status: "pending" };
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      pendingFilter.$or = [
        { tenantName: { $regex: term, $options: "i" } },
        { slug: { $regex: term, $options: "i" } },
        { ownerEmail: { $regex: term, $options: "i" } },
      ];
    }
    const [pendingList, pendingTotal] = await Promise.all([
      PendingTenantInvite.find(pendingFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PendingTenantInvite.countDocuments(pendingFilter),
    ]);
    const data = pendingList.map((p) => ({
      id: p._id,
      _id: p._id,
      pendingInviteId: p._id,
      name: p.tenantName,
      slug: p.slug,
      status: "invited",
      ownerEmail: p.ownerEmail,
      ownerName: p.ownerName || null,
      planId: p.planId,
      planName: null,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    }));
    const statusCounts = { active: 0, trial: 0, suspended: 0, invited: pendingTotal };
    return { data, total: pendingTotal, statusCounts };
  }

  // Step 2: build filter (platform admin sees all tenants)
  const filter = tenantIds ? { _id: { $in: tenantIds } } : {};
  if (status && status !== "all") filter.status = status;
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
    ];
  }

  const [total, statusCountsBase, tenants] = await Promise.all([
    Tenant.countDocuments(filter),
    Tenant.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).then((rows) => {
      const m = new Map(rows.map((r) => [r._id, r.count]));
      return {
        active: m.get("active") ?? 0,
        trial: m.get("trial") ?? 0,
        suspended: m.get("suspended") ?? 0,
      };
    }),
    Tenant.find(filter)
      .select("_id name slug status suspendedUntil readOnlyMode readOnlyUntil planId createdAt")
      .populate("planId", "name planCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  let invitedTotal = 0;
  if (isPlatformAdmin) {
    invitedTotal = await PendingTenantInvite.countDocuments({ status: "pending" });
  }

  const roleMap = new Map(
    memberships.map(m => [String(m.tenantId), m.role])
  );
  const data = tenants.map(t => ({
    id: t._id,
    _id: t._id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    suspendedUntil: t.suspendedUntil,
    readOnlyMode: t.readOnlyMode,
    readOnlyUntil: t.readOnlyUntil,
    planId: t.planId?._id ?? t.planId,
    planName: t.planId?.name ?? t.planId?.planCode ?? null,
    createdAt: t.createdAt,
    role: roleMap.get(String(t._id))
  }));

  const statusCounts = { ...statusCountsBase, invited: invitedTotal };
  return { data, total, statusCounts };
}
