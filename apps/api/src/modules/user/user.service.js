import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { User, UserSession, Role } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { config } from "#api/config/env.js";
import {
  getUserRefreshIds,
  deleteManyRefreshRecords,
  clearUserRefreshSet,
  getRefreshRecord,
  deleteRefreshRecord,
  removeUserRefreshId,
  setPasswordResetToken,
  PLATFORM_INVITE_TTL_SECONDS
} from "#api/modules/auth/auth.redis.js";
import { enqueuePlatformInviteEmail } from "#infra/queue/email.queue.js";

const BCRYPT_ROUNDS = 12;

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Get current user profile (no auth fields).
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getMe(userId) {
  const user = await User.findById(userId)
    .select("email name avatarUrl emailVerified status createdAt updatedAt isPlatformAdmin platformRoleId")
    .lean();
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  let platformRole = null;
  let permissions = [];
  if (user.isPlatformAdmin && user.platformRoleId) {
    const role = await Role.findById(user.platformRoleId).select("name permissions").lean();
    if (role) {
      platformRole = role.name;
      permissions = role.permissions ?? [];
    }
  }
  if (user.isPlatformAdmin && !platformRole) {
    platformRole = "super_admin";
    permissions = ["*"];
  }
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isPlatformAdmin: user.isPlatformAdmin ?? false,
    platformRole: platformRole ?? null,
    permissions: permissions
  };
}

/**
 * Update current user (name, avatarUrl).
 * @param {string} userId
 * @param {{ name?: string, avatarUrl?: string | null }} payload
 * @returns {Promise<object>}
 */
export async function updateMe(userId, payload) {
  const update = {};
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.avatarUrl !== undefined) update.avatarUrl = payload.avatarUrl;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true }
  )
    .select("email name avatarUrl emailVerified status createdAt updatedAt")
    .lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Change password; revoke all other sessions.
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} input
 * @returns {Promise<{ message: string }>}
 */
export async function changePassword(userId, input) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const passwordHash = user.auth?.passwordHash;
  if (!passwordHash) {
    throw ApiError.badRequest("Invalid credentials");
  }

  const valid = await verifyPassword(input.currentPassword, passwordHash);
  if (!valid) {
    throw ApiError.badRequest("Invalid credentials");
  }

  const newHash = await hashPassword(input.newPassword);
  const now = new Date();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "auth.passwordHash": newHash,
        passwordChangedAt: now
      }
    }
  );

  const refreshIds = await getUserRefreshIds(userId);
  await deleteManyRefreshRecords(refreshIds);
  await clearUserRefreshSet(userId);
  await UserSession.updateMany(
    { userId },
    { $set: { revokedAt: now } }
  ).catch(() => {});

  logger.info({ userId }, "Password changed, all sessions revoked");
  return { message: "Password changed successfully." };
}

/**
 * List active sessions for current user (excluding revoked).
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function getSessions(userId) {
  const sessions = await UserSession.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  })
    .select("tokenId deviceId userAgent ip expiresAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return sessions.map((s) => ({
    tokenId: s.tokenId,
    deviceId: s.deviceId,
    userAgent: s.userAgent ?? null,
    ip: s.ip ?? null,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt
  }));
}

/**
 * List platform users (admin only). Pagination, filters.
 * @param {{ page?: number, limit?: number, status?: string, search?: string, platformRoleId?: string, sort?: string }} opts
 * @returns {Promise<{ users: object[], total: number, page: number, limit: number, totalPages: number }>}
 */
export async function listUsers(opts = {}) {
  const { page = 1, limit = 20, status, search, platformRoleId, sort = "-createdAt" } = opts;
  const skip = (page - 1) * limit;

  const query = {};
  // "invited" is a computed status: platform admin created via invite but hasn't logged in yet.
  if (status && status !== "invited") query.status = status;
  if (platformRoleId) query.platformRoleId = platformRoleId;
  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { email: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } }
    ];
  }
  if (status === "invited") {
    query.isPlatformAdmin = true;
    query.emailVerified = false;
    query["auth.lastLoginAt"] = null;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("email name avatarUrl status emailVerified isPlatformAdmin platformRoleId createdAt updatedAt auth.lastLoginAt failedLoginAttempts lockedUntil")
      .populate("platformRoleId", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  const items = users.map((u) => ({
    id: u._id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    status:
      u.isPlatformAdmin && u.emailVerified === false && (u.auth?.lastLoginAt ?? null) === null
        ? "invited"
        : u.status,
    emailVerified: u.emailVerified,
    isPlatformAdmin: u.isPlatformAdmin ?? false,
    platformRole: u.platformRoleId?.name ?? null,
    platformRoleId: u.platformRoleId?._id ?? null,
    lastLoginAt: u.auth?.lastLoginAt ?? null,
    failedLoginAttempts: u.failedLoginAttempts ?? 0,
    lockedUntil: u.lockedUntil ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));

  return {
    users: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get user by ID (admin only).
 * @param {string} userId - target user id
 * @returns {Promise<object|null>}
 */
export async function getUserById(userId) {
  const user = await User.findById(userId)
    .select("email name avatarUrl status emailVerified isPlatformAdmin platformRoleId createdAt updatedAt auth.lastLoginAt failedLoginAttempts lockedUntil")
    .populate("platformRoleId", "name permissions")
    .lean();
  if (!user) return null;

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    emailVerified: user.emailVerified,
    isPlatformAdmin: user.isPlatformAdmin ?? false,
    platformRole: user.platformRoleId?.name ?? null,
    platformRoleId: user.platformRoleId?._id ?? null,
    permissions: user.platformRoleId?.permissions ?? [],
    lastLoginAt: user.auth?.lastLoginAt ?? null,
    failedLoginAttempts: user.failedLoginAttempts ?? 0,
    lockedUntil: user.lockedUntil ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Update user (admin only).
 * @param {string} targetUserId
 * @param {{ name?: string, avatarUrl?: string | null, status?: string, platformRoleId?: string | null }} payload
 * @returns {Promise<object>}
 */
export async function updateUserByAdmin(targetUserId, payload) {
  const update = {};
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.avatarUrl !== undefined) update.avatarUrl = payload.avatarUrl;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.platformRoleId !== undefined) update.platformRoleId = payload.platformRoleId || null;

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { $set: update },
    { new: true, runValidators: true }
  )
    .select("email name avatarUrl status emailVerified isPlatformAdmin platformRoleId createdAt updatedAt")
    .populate("platformRoleId", "name")
    .lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    emailVerified: user.emailVerified,
    isPlatformAdmin: user.isPlatformAdmin ?? false,
    platformRole: user.platformRoleId?.name ?? null,
    platformRoleId: user.platformRoleId?._id ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Disable user (admin only).
 * @param {string} targetUserId
 * @returns {Promise<object>}
 */
export async function disableUser(targetUserId) {
  const user = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { status: "disabled" } },
    { new: true }
  )
    .select("email name status")
    .lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  logger.info({ targetUserId }, "User disabled by admin");
  return { message: "User disabled", user: { id: user._id, email: user.email, status: user.status } };
}

/**
 * Unlock user (admin only).
 * @param {string} targetUserId
 * @returns {Promise<object>}
 */
export async function unlockUser(targetUserId) {
  const user = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { lockedUntil: null, failedLoginAttempts: 0 } },
    { new: true }
  )
    .select("email name status lockedUntil")
    .lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  logger.info({ targetUserId }, "User unlocked by admin");
  return { message: "User unlocked", user: { id: user._id, email: user.email, status: user.status } };
}

/**
 * Invite a platform admin user. Creates user if needed, sets platform role, sends set-password email.
 * @param {{ email: string, name: string, platformRoleId: string }} input
 * @param {string} invitedByUserId
 * @returns {Promise<{ message: string, email: string }>}
 */
export async function invitePlatformUser(input, invitedByUserId) {
  const email = input.email.toLowerCase().trim();
  const role = await Role.findById(input.platformRoleId).select("name isPlatformRole").lean();
  if (!role || !role.isPlatformRole) {
    throw ApiError.badRequest("Invalid platform role");
  }

  let user = await User.findOne({ email }).lean();
  if (user) {
    // Requirement: do not allow inviting an email that already exists in platform.
    throw ApiError.conflict("User already exists");
  } else {
    const tempPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(tempPassword);
    user = await User.create({
      email,
      name: input.name || email.split("@")[0],
      auth: { passwordHash, passwordAlgo: "bcrypt" },
      isPlatformAdmin: true,
      platformRoleId: input.platformRoleId,
      status: "active",
      emailVerified: false
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await setPasswordResetToken(token, String(user._id), PLATFORM_INVITE_TTL_SECONDS);
  const setPasswordLink = `${config.app.superAdminUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const inviter = await User.findById(invitedByUserId).select("name").lean();
  try {
    await enqueuePlatformInviteEmail({
      to: email,
      inviteeName: input.name || null,
      inviterName: inviter?.name ?? "An administrator",
      roleName: role.name,
      setPasswordLink
    });
  } catch (err) {
    logger.warn({ err, email }, "Platform invite email enqueue failed");
  }

  logger.info({ email, platformRoleId: input.platformRoleId, invitedBy: invitedByUserId }, "Platform admin invited");
  return { message: "Invitation sent", email };
}

/**
 * Reinvite a pending platform admin (admin only). Only allowed for "invited" users.
 * @param {string} targetUserId
 * @param {string} invitedByUserId
 * @returns {Promise<{ message: string, email: string }>}
 */
export async function reinvitePlatformUser(targetUserId, invitedByUserId) {
  const user = await User.findById(targetUserId)
    .select("email name isPlatformAdmin emailVerified auth.lastLoginAt platformRoleId")
    .lean();
  if (!user) throw ApiError.notFound("User not found");

  const isInvited =
    (user.isPlatformAdmin ?? false) &&
    user.emailVerified === false &&
    (user.auth?.lastLoginAt ?? null) === null;

  if (!isInvited) {
    throw ApiError.badRequest("User is not in invited state");
  }

  const role = user.platformRoleId
    ? await Role.findById(user.platformRoleId).select("name isPlatformRole").lean()
    : null;

  const token = crypto.randomBytes(32).toString("hex");
  await setPasswordResetToken(token, String(user._id), PLATFORM_INVITE_TTL_SECONDS);
  const setPasswordLink = `${config.app.superAdminUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const inviter = await User.findById(invitedByUserId).select("name").lean();
  try {
    await enqueuePlatformInviteEmail({
      to: user.email,
      inviteeName: user.name || null,
      inviterName: inviter?.name ?? "An administrator",
      roleName: role?.name ?? "platform admin",
      setPasswordLink
    });
  } catch (err) {
    logger.warn({ err, email: user.email }, "Platform reinvite email enqueue failed");
  }

  logger.info({ targetUserId, invitedBy: invitedByUserId }, "Platform admin reinvited");
  return { message: "Invitation re-sent", email: user.email };
}

/**
 * Cancel platform invite (admin only). Invalidates the set-password link.
 * Only allowed for "invited" users (never logged in).
 * @param {string} targetUserId
 * @param {string} actorUserId
 * @returns {Promise<{ message: string }>}
 */
export async function cancelPlatformInvite(targetUserId, actorUserId) {
  const user = await User.findById(targetUserId)
    .select("email isPlatformAdmin emailVerified auth.lastLoginAt")
    .lean();
  if (!user) throw ApiError.notFound("User not found");

  const isInvited =
    (user.isPlatformAdmin ?? false) &&
    user.emailVerified === false &&
    (user.auth?.lastLoginAt ?? null) === null;

  if (!isInvited) {
    throw ApiError.badRequest("User is not in invited state");
  }

  const { setPlatformInviteRevoked } = await import("#api/modules/auth/auth.redis.js");
  await setPlatformInviteRevoked(targetUserId);

  await auditService
    .log({
      action: "PLATFORM_INVITE_CANCELLED",
      resourceType: "User",
      resourceId: targetUserId,
      userId: actorUserId,
      tenantId: null,
      diff: { targetUserId, email: user.email },
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ targetUserId, email: user.email }, "Platform invite cancelled");
  return { message: "Invite cancelled. The set-password link is no longer valid." };
}

/**
 * Delete user (admin only).
 * @param {string} targetUserId
 * @param {string} actorUserId
 * @returns {Promise<void>}
 */
export async function deleteUserByAdmin(targetUserId, actorUserId) {
  if (String(targetUserId) === String(actorUserId)) {
    throw ApiError.badRequest("You cannot delete your own account");
  }

  const user = await User.findById(targetUserId).select("_id email").lean();
  if (!user) throw ApiError.notFound("User not found");

  const refreshIds = await getUserRefreshIds(targetUserId).catch(() => []);
  if (refreshIds?.length) {
    await deleteManyRefreshRecords(refreshIds).catch(() => {});
    await clearUserRefreshSet(targetUserId).catch(() => {});
  }

  await UserSession.updateMany(
    { userId: new mongoose.Types.ObjectId(targetUserId) },
    { $set: { revokedAt: new Date() } }
  ).catch(() => {});

  await User.deleteOne({ _id: new mongoose.Types.ObjectId(targetUserId) });
  logger.info({ targetUserId }, "User deleted by admin");
}

/**
 * Revoke a specific session by tokenId (Redis refresh + DB session).
 * @param {string} userId
 * @param {string} tokenId
 * @returns {Promise<void>}
 */
export async function revokeSession(userId, tokenId) {
  const session = await UserSession.findOne({ userId, tokenId }).lean();
  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  const refreshIds = await getUserRefreshIds(userId);
  for (const refreshId of refreshIds) {
    const record = await getRefreshRecord(refreshId);
    if (record?.sessionTokenId === tokenId) {
      await deleteRefreshRecord(refreshId);
      await removeUserRefreshId(userId, refreshId);
      break;
    }
  }

  await UserSession.updateOne(
    { userId, tokenId },
    { $set: { revokedAt: new Date() } }
  );
}
