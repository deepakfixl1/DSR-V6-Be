/**
 * Membership service. Invites, accept, list, update, remove, transfer ownership.
 * All DB, Redis, audit, notification and limit checks here.
 */

import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  Tenant,
  TenantMembership,
  TenantInvite,
  TenantUsage,
  Department,
  PlanCatalog,
  Subscription,
  User,
  WorkReport,
  WorkGoal,
  Blocker,
} from "#db/models/index.js";
import * as auditService from "#api/modules/audit/audit.service.js";
import * as notificationService from "#api/modules/notification/notification.service.js";
import { enqueueTenantInviteEmail } from "#infra/queue/email.queue.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { config } from "#api/config/env.js";

const env = config.app.env;
const INVITE_TTL_DAYS = 7;
const TENANT_PLATFORM_URL = config.app.tenantPlatformUrl || "http://localhost:5175";

/**
 * Hashes a token for storage (never store plain tokens).
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
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

/**
 * Gets or creates TenantUsage for tenant + month; returns doc.
 * @param {import('mongoose').Types.ObjectId} tenantId
 * @param {string} monthKey
 * @returns {Promise<import('mongoose').Document>}
 */
async function getOrCreateUsage(tenantId, monthKey) {
  let usage = await TenantUsage.findOne({ tenantId, monthKey });
  if (!usage) {
    usage = await TenantUsage.create({
      tenantId,
      monthKey,
      activeUsers: 0,
      apiCalls: 0,
      storageBytes: 0,
    });
  }
  return usage;
}

/**
 * Checks plan maxUsers limit for tenant.
 * @param {string} tenantId
 * @returns {Promise<{ allowed: boolean, current: number, max: number }>}
 */
async function checkMaxUsersLimit(tenantId) {
  const tenant = await Tenant.findById(tenantId).select("planId").lean();
  if (!tenant?.planId) {
    return { allowed: false, current: 0, max: 0 };
  }
  const plan = await PlanCatalog.findById(tenant.planId).lean();
  const max = plan?.limits?.maxUsers ?? 0;
  const monthKey = getCurrentMonthKey();
  const usage = await TenantUsage.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    monthKey,
  }).lean();
  const current = usage?.activeUsers ?? 0;
  return { allowed: current < max, current, max };
}

/**
 * Paginated list of members (with user and role populated).
 * Platform admins can list any tenant's members; others must be a member.
 * @param {string} tenantId
 * @param {string} userId - caller (must be member, or platform admin)
 * @param {{ page: number, limit: number }} opts
 * @returns {Promise<{ docs: object[], total: number, page: number, limit: number, pages: number }>}
 */
export async function listMembers(tenantId, userId, opts = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const excludePlatformAdmins = opts.excludePlatformAdmins === true;

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

  const filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (excludePlatformAdmins) {
    const platformAdminIds = await User.find({ isPlatformAdmin: true }).distinct("_id");
    filter.userId = { $nin: platformAdminIds };
  }
  // Department scoping — restrict member list to a specific department
  if (opts.departmentId) {
    filter.departmentId = new mongoose.Types.ObjectId(opts.departmentId);
  }
  // Self scoping — restrict to only the requesting user's membership
  if (opts.selfOnly && opts.selfUserId) {
    filter.userId = new mongoose.Types.ObjectId(opts.selfUserId);
  }

  const [docs, total] = await Promise.all([
    TenantMembership.find(filter)
      .populate("userId", "name email")
      .populate("roleId", "name permissions")
      .populate("departmentId", "name")
      .sort({ isOwner: -1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TenantMembership.countDocuments(filter),
  ]);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Returns current user's tenant profile (membership + user + role + managed departments).
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<{ membership: object, tenant: object|null, departments: object[] }>}
 */
export async function getMyTenantProfile(tenantId, userId) {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const membership = await TenantMembership.findOne({
    tenantId: tenantObjectId,
    userId: userObjectId,
    status: "active",
  })
    .populate("userId", "name email avatarUrl status")
    .populate("roleId", "name permissions")
    .populate("invitedBy", "name email")
    .lean();

  if (!membership) {
    throw ApiError.forbidden("Not a member of this tenant");
  }

  const [tenant, departments] = await Promise.all([
    Tenant.findById(tenantObjectId).select("name slug status planId createdAt").lean(),
    Department.find({
      tenantId: tenantObjectId,
      managerId: membership._id,
      deletedAt: null,
    })
      .select("name slug description type status managerId")
      .lean(),
  ]);

  return {
    membership,
    tenant: tenant ?? null,
    departments,
  };
}

/**
 * Invites a member by email. Owner/Admin or platform admin; checks maxUsers; sends invite email.
 * @param {string} tenantId
 * @param {object} input - { email, roleId }
 * @param {string} invitedByUserId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function inviteMember(tenantId, input, invitedByUserId, ctx = {}) {
  const user = await User.findById(invitedByUserId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(invitedByUserId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) {
      throw ApiError.forbidden("Tenant owner or admin access required");
    }
  }

  const { allowed, current, max } = await checkMaxUsersLimit(tenantId);
  if (!allowed) {
    throw ApiError.forbidden(
      `Plan limit reached: active users (${current}) >= max users (${max}). Upgrade to invite more.`
    );
  }

  const email = input.email.toLowerCase().trim();
  const existingMember = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: (await User.findOne({ email }).select("_id").lean())?._id,
  }).lean();
  if (existingMember) {
    throw ApiError.conflict("User is already a member");
  }

  const pendingInvite = await TenantInvite.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    email,
    status: "pending",
  }).lean();
  if (pendingInvite) {
    throw ApiError.conflict("Pending invite already exists for this email");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invite = await TenantInvite.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    email,
    roleId: new mongoose.Types.ObjectId(input.roleId),
    invitedBy: new mongoose.Types.ObjectId(invitedByUserId),
    tokenHash,
    expiresAt,
    status: "pending",
  });

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  const inviter = await User.findById(invitedByUserId).select("name").lean();
  const acceptLink = `${TENANT_PLATFORM_URL}/invite/accept?token=${encodeURIComponent(token)}&tenantId=${tenantId}`;

  try {
    await enqueueTenantInviteEmail({
      to: email,
      inviteeName: null,
      inviterName: inviter?.name ?? "A team member",
      tenantName: tenant?.name ?? "Workspace",
      acceptLink,
      expiresInDays: INVITE_TTL_DAYS,
    });
  } catch (err) {
    logger.warn({ err, inviteId: invite._id }, "Invite email enqueue failed");
  }

  await auditService
    .log({
      action: "MEMBER_INVITED",
      resourceType: "TenantInvite",
      resourceId: invite._id,
      userId: new mongoose.Types.ObjectId(invitedByUserId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { email, roleId: String(input.roleId) },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, email, inviteId: invite._id }, "Member invited");
  return {
    id: invite._id,
    email: invite.email,
    roleId: invite.roleId,
    expiresAt: invite.expiresAt,
    status: invite.status,
  };
}

/**
 * Lists invites for a tenant (owner only).
 * @param {string} tenantId
 * @param {string} userId
 * @param {{ status?: 'pending'|'accepted'|'expired'|'revoked', page?: number, limit?: number }} opts
 */
export async function listInvites(tenantId, userId, opts = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) throw ApiError.forbidden("Tenant owner or admin access required");
  }

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const status = opts.status ?? "pending";

  const filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (status) filter.status = status;

  const [docs, total] = await Promise.all([
    TenantInvite.find(filter)
      .populate("roleId", "name")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TenantInvite.countDocuments(filter),
  ]);

  return {
    docs: docs.map((d) => ({
      id: d._id,
      email: d.email,
      status: d.status,
      roleId: d.roleId?._id ?? d.roleId,
      roleName: d.roleId?.name ?? null,
      invitedBy: d.invitedBy ? { id: d.invitedBy._id, name: d.invitedBy.name, email: d.invitedBy.email } : null,
      expiresAt: d.expiresAt,
      createdAt: d.createdAt,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Resend an existing pending invite (owner or platform admin). Optionally update role.
 * @param {string} tenantId
 * @param {string} inviteId
 * @param {string} userId
 * @param {{ roleId?: string }} patch
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 */
export async function resendInvite(tenantId, inviteId, userId, patch = {}, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) throw ApiError.forbidden("Tenant owner or admin access required");
  }

  const invite = await TenantInvite.findOne({
    _id: new mongoose.Types.ObjectId(inviteId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "pending",
  }).lean();
  if (!invite) throw ApiError.notFound("Pending invite not found");

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const update = { tokenHash, expiresAt };
  if (patch?.roleId) update.roleId = new mongoose.Types.ObjectId(patch.roleId);

  await TenantInvite.updateOne(
    { _id: invite._id },
    { $set: update }
  );

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  const inviter = await User.findById(userId).select("name").lean();
  const acceptLink = `${TENANT_PLATFORM_URL}/invite/accept?token=${encodeURIComponent(token)}&tenantId=${tenantId}`;

  try {
    await enqueueTenantInviteEmail({
      to: invite.email,
      inviteeName: null,
      inviterName: inviter?.name ?? "A team member",
      tenantName: tenant?.name ?? "Workspace",
      acceptLink,
      expiresInDays: INVITE_TTL_DAYS,
    });
  } catch (err) {
    logger.warn({ err, inviteId: invite._id }, "Invite email enqueue failed");
  }

  await auditService
    .log({
      action: "MEMBER_INVITE_RESENT",
      resourceType: "TenantInvite",
      resourceId: invite._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { email: invite.email, roleId: String(update.roleId ?? invite.roleId) },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  const updated = await TenantInvite.findById(invite._id)
    .populate("roleId", "name")
    .populate("invitedBy", "name email")
    .lean();

  return {
    id: updated._id,
    email: updated.email,
    status: updated.status,
    roleId: updated.roleId?._id ?? updated.roleId,
    roleName: updated.roleId?.name ?? null,
    invitedBy: updated.invitedBy ? { id: updated.invitedBy._id, name: updated.invitedBy.name, email: updated.invitedBy.email } : null,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
  };
}

/**
 * Cancels/revokes a pending tenant member invite. Invalidates the invite link.
 * Owner or platform admin.
 * @param {string} tenantId
 * @param {string} inviteId
 * @param {string} userId
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<{ success: boolean }>}
 */
export async function cancelInvite(tenantId, inviteId, userId, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) throw ApiError.forbidden("Tenant owner or admin access required");
  }

  const invite = await TenantInvite.findOne({
    _id: new mongoose.Types.ObjectId(inviteId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "pending",
  });
  if (!invite) throw ApiError.notFound("Pending invite not found");

  invite.status = "revoked";
  await invite.save();

  await auditService
    .log({
      action: "MEMBER_INVITE_REVOKED",
      resourceType: "TenantInvite",
      resourceId: invite._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { email: invite.email, status: "revoked" },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, inviteId, email: invite.email }, "Member invite cancelled");
  return { success: true };
}

/**
 * Accepts an invite with token; creates membership and increments activeUsers.
 * @param {string} tenantId
 * @param {string} token - plain token from email
 * @param {string} userId - authenticated user accepting
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function acceptInvite(tenantId, token, userId, ctx = {}) {
  const tokenHash = hashToken(token);
  const invite = await TenantInvite.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    tokenHash,
    status: "pending",
  }).select("+tokenHash").lean();

  if (!invite) {
    throw ApiError.badRequest("Invalid or expired invite token");
  }
  if (new Date() > new Date(invite.expiresAt)) {
    await TenantInvite.updateOne(
      { _id: invite._id },
      { $set: { status: "expired" } }
    );
    throw ApiError.badRequest("Invite has expired");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).select("email").lean();
  if (!user || user.email.toLowerCase() !== invite.email) {
    throw ApiError.forbidden("Invite was sent to a different email; sign in with that account to accept");
  }

  const existing = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: userObjectId,
  }).lean();
  if (existing) {
    throw ApiError.conflict("Already a member of this tenant");
  }

  await TenantMembership.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: userObjectId,
    roleId: invite.roleId,
    status: "active",
    joinedAt: new Date(),
    invitedBy: invite.invitedBy,
    isOwner: false,
  });

  const monthKey = getCurrentMonthKey();
  const usage = await getOrCreateUsage(
    new mongoose.Types.ObjectId(tenantId),
    monthKey
  );
  usage.activeUsers = (usage.activeUsers || 0) + 1;
  await usage.save();

  await TenantInvite.updateOne(
    { _id: invite._id },
    { $set: { status: "accepted" } }
  );

  await auditService
    .log({
      action: "MEMBER_JOINED",
      resourceType: "TenantMembership",
      resourceId: null,
      userId: userObjectId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { email: invite.email, roleId: String(invite.roleId) },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  await notificationService
    .createNotification({
      userId: userObjectId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: "member_joined",
      title: "Joined workspace",
      body: `You joined "${tenant?.name ?? "Workspace"}".`,
      link: `/tenants/${tenantId}`,
      priority: "normal",
      payload: { tenantId, inviteId: String(invite._id) },
    })
    .catch((err) => logger.warn({ err }, "Notification create failed"));

  logger.info({ tenantId, userId }, "Member joined via invite");
  return { success: true, tenantId };
}

/**
 * Validates member invite token (for set-password page). No auth required.
 * @param {string} token - plain token from email
 * @param {string} tenantId
 * @returns {Promise<{ tenantName: string, email: string, userExists: boolean }>}
 */
export async function validateMemberInvite(token, tenantId) {
  const tokenHash = hashToken(token);
  const invite = await TenantInvite.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    tokenHash,
    status: "pending",
  }).lean();

  if (!invite) {
    throw ApiError.badRequest("Invalid or expired invite link");
  }
  if (new Date() > new Date(invite.expiresAt)) {
    await TenantInvite.updateOne(
      { _id: invite._id },
      { $set: { status: "expired" } }
    );
    throw ApiError.badRequest("This invite has expired");
  }

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  const existingUser = await User.findOne({ email: invite.email.toLowerCase() }).select("_id").lean();

  return {
    tenantName: tenant?.name ?? "Workspace",
    email: invite.email,
    userExists: !!existingUser,
  };
}

/**
 * Accepts member invite with set password (for new users). Creates user, sets password, joins tenant.
 * No auth required.
 * @param {{ token: string, tenantId: string, newPassword: string, name?: string }} input
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<{ message: string, tenantId: string }>}
 */
export async function acceptMemberInviteWithPassword(input, ctx = {}) {
  const { token, tenantId, newPassword, name } = input;
  const tokenHash = hashToken(token);
  const invite = await TenantInvite.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    tokenHash,
    status: "pending",
  }).lean();

  if (!invite) {
    throw ApiError.badRequest("Invalid or expired invite link");
  }
  if (new Date() > new Date(invite.expiresAt)) {
    await TenantInvite.updateOne(
      { _id: invite._id },
      { $set: { status: "expired" } }
    );
    throw ApiError.badRequest("This invite has expired");
  }

  const email = invite.email.toLowerCase().trim();
  let user = await User.findOne({ email }).lean();
  if (user) {
    throw ApiError.badRequest("An account with this email already exists. Please sign in and accept the invite from your dashboard.");
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const displayName = (name || email.split("@")[0] || "User").trim();
  const created = await User.create({
    email,
    name: displayName,
    auth: { passwordHash, passwordAlgo: "bcrypt" },
    emailVerified: true,
    status: "active",
  });
  const userId = String(created._id);

  await TenantMembership.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: created._id,
    roleId: invite.roleId,
    status: "active",
    joinedAt: new Date(),
    invitedBy: invite.invitedBy,
    isOwner: false,
  });

  const monthKey = getCurrentMonthKey();
  const usage = await getOrCreateUsage(
    new mongoose.Types.ObjectId(tenantId),
    monthKey
  );
  usage.activeUsers = (usage.activeUsers || 0) + 1;
  await usage.save();

  await TenantInvite.updateOne(
    { _id: invite._id },
    { $set: { status: "accepted" } }
  );

  await auditService
    .log({
      action: "MEMBER_JOINED",
      resourceType: "TenantMembership",
      resourceId: null,
      userId: created._id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { email, roleId: String(invite.roleId), via: "set_password" },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  await notificationService
    .createNotification({
      userId: created._id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: "member_joined",
      title: "Joined workspace",
      body: `You joined "${tenant?.name ?? "Workspace"}".`,
      link: `/tenants/${tenantId}`,
      priority: "normal",
      payload: { tenantId, inviteId: String(invite._id) },
    })
    .catch((err) => logger.warn({ err }, "Notification create failed"));

  logger.info({ tenantId, userId }, "Member joined via invite (set password)");
  return {
    message: "Account created. You can now sign in with your email and password.",
    tenantId,
  };
}

/**
 * Updates a member's role/team/status. Owner/Admin or platform admin.
 * @param {string} tenantId
 * @param {string} targetUserId
 * @param {object} input - { roleId?, teamId?, status? }
 * @param {string} userId - caller
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function updateMembership(tenantId, targetUserId, input, userId, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) {
      throw ApiError.forbidden("Tenant owner or admin access required");
    }
  }

  const target = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(targetUserId),
  });
  if (!target) {
    throw ApiError.notFound("Member not found");
  }

  const diff = {};
  if (input.roleId !== undefined) {
    diff.roleId = { from: String(target.roleId), to: String(input.roleId) };
    target.roleId = new mongoose.Types.ObjectId(input.roleId);
  }
  if (input.teamId !== undefined) {
    target.teamId = input.teamId
      ? new mongoose.Types.ObjectId(input.teamId)
      : null;
    diff.teamId = input.teamId;
  }
  if (input.status !== undefined) {
    diff.status = { from: target.status, to: input.status };
    target.status = input.status;
  }
  await target.save();

  await auditService
    .log({
      action: "MEMBER_UPDATED",
      resourceType: "TenantMembership",
      resourceId: target._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, targetUserId }, "Membership updated");
  return target.toObject();
}

/**
 * Disables membership and decrements activeUsers.
 * @param {string} tenantId
 * @param {string} targetUserId
 * @param {string} userId - caller (owner/admin or platform admin)
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function removeMember(tenantId, targetUserId, userId, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;
  if (!isPlatformAdmin) {
    const membership = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    }).lean();
    if (!membership) {
      throw ApiError.forbidden("Tenant owner or admin access required");
    }
  }

  const target = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(targetUserId),
  });
  if (!target) {
    throw ApiError.notFound("Member not found");
  }
  if (target.isOwner) {
    throw ApiError.forbidden("Cannot remove the owner; transfer ownership first");
  }

  target.status = "disabled";
  await target.save();

  const monthKey = getCurrentMonthKey();
  const usage = await TenantUsage.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    monthKey,
  });
  if (usage && usage.activeUsers > 0) {
    usage.activeUsers -= 1;
    await usage.save();
  }

  await auditService
    .log({
      action: "MEMBER_REMOVED",
      resourceType: "TenantMembership",
      resourceId: target._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: { targetUserId, status: "disabled" },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  await notificationService
    .createNotification({
      userId: new mongoose.Types.ObjectId(targetUserId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: "member_removed",
      title: "Removed from workspace",
      body: "You have been removed from this workspace.",
      link: null,
      priority: "normal",
      payload: { tenantId },
    })
    .catch((err) => logger.warn({ err }, "Notification create failed"));

  logger.info({ tenantId, targetUserId }, "Member removed");
  return { success: true };
}

/**
 * Transfers ownership to another member. Current owner or platform admin.
 * @param {string} tenantId
 * @param {string} newOwnerUserId
 * @param {string} userId - current owner (or platform admin)
 * @param {{ ip?: string, userAgent?: string }} [ctx]
 * @returns {Promise<object>}
 */
export async function transferOwnership(tenantId, newOwnerUserId, userId, ctx = {}) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  let currentOwner;
  if (isPlatformAdmin) {
    currentOwner = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: "active",
      isOwner: true,
    });
  } else {
    currentOwner = await TenantMembership.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      isOwner: true,
    });
  }
  if (!currentOwner) {
    throw ApiError.forbidden("Only the current owner or platform admin can transfer ownership");
  }

  const newOwnerMembership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(newOwnerUserId),
    status: "active",
  });
  if (!newOwnerMembership) {
    throw ApiError.notFound("Target user is not an active member");
  }

  currentOwner.isOwner = false;
  await currentOwner.save();
  newOwnerMembership.isOwner = true;
  await newOwnerMembership.save();

  await auditService
    .log({
      action: "OWNER_TRANSFERRED",
      resourceType: "TenantMembership",
      resourceId: newOwnerMembership._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      diff: {
        previousOwnerId: String(userId),
        newOwnerId: String(newOwnerUserId),
      },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  await notificationService
    .createNotification({
      userId: new mongoose.Types.ObjectId(newOwnerUserId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: "owner_transferred",
      title: "You are now the owner",
      body: "Ownership of this workspace has been transferred to you.",
      link: `/tenants/${tenantId}/settings`,
      priority: "high",
      payload: { tenantId, previousOwnerId: String(userId) },
    })
    .catch((err) => logger.warn({ err }, "Notification create failed"));

  logger.info({ tenantId, newOwnerUserId, previousOwnerId: userId }, "Ownership transferred");
  return { success: true, newOwnerId: newOwnerUserId };
}

export async function searchMembers(tenantId, userId, query = {}) {
  await listMembers(tenantId, userId, { page: 1, limit: 1 });

  const filter = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active",
  };

  if (query.search) {
    const userIds = await User.find({
      $or: [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
      ],
    }).distinct("_id");

    filter.$or = [
      { userId: { $in: userIds } },
      { employeeId: { $regex: query.search, $options: "i" } },
    ];
  }

  if (query.departmentId) {
    filter.departmentId = new mongoose.Types.ObjectId(query.departmentId);
  }

  return TenantMembership.find(filter)
    .populate("userId", "name email avatarUrl")
    .populate("roleId", "name permissions")
    .populate("managerId", "userId")
    .limit(Math.min(50, Math.max(1, Number(query.limit ?? 20))))
    .lean();
}

export async function getOrgChart(tenantId, userId) {
  await listMembers(tenantId, userId, { page: 1, limit: 1 });

  const members = await TenantMembership.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status: "active",
  })
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .lean();

  return members.map((member) => ({
    id: member._id,
    userId: member.userId?._id ?? member.userId,
    name: member.userId?.name ?? null,
    email: member.userId?.email ?? null,
    departmentId: member.departmentId?._id ?? member.departmentId ?? null,
    departmentName: member.departmentId?.name ?? null,
    managerId: member.managerId ?? null,
    roleId: member.roleId ?? null,
    isOwner: member.isOwner,
  }));
}

export async function updateMemberDepartment(tenantId, targetUserId, departmentId, userId, ctx = {}) {
  const membership = await updateMembership(
    tenantId,
    targetUserId,
    {},
    userId,
    ctx
  );

  const doc = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(targetUserId),
  });
  if (!doc) throw ApiError.notFound("Member not found");

  doc.departmentId = departmentId ? new mongoose.Types.ObjectId(departmentId) : null;
  await doc.save();
  return doc.toObject();
}

export async function getMemberActivity(tenantId, targetUserId, userId) {
  await listMembers(tenantId, userId, { page: 1, limit: 1 });
  const membership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(targetUserId),
  }).lean();
  if (!membership) throw ApiError.notFound("Member not found");

  const [reports, goals, blockers] = await Promise.all([
    WorkReport.find({ tenantId, employeeMemberId: membership._id }).sort({ createdAt: -1 }).limit(10).lean(),
    WorkGoal.find({ tenantId, assignedToMemberId: membership._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Blocker.find({ tenantId, assigneeId: targetUserId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return { reports, goals, blockers };
}
