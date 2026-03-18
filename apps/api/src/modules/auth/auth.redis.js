import { config } from "#api/config/env.js";
import { ApiError } from "#api/utils/ApiError.js";
import { getRedisClient } from "#infra/cache/redis.js";

const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 15 * 60;
const PLATFORM_INVITE_TTL_SECONDS = 24 * 60 * 60; // 24 hours for invite links

/**
 * Ensures Redis is available before command execution.
 * @returns {import("redis").RedisClientType}
 */
const requireRedisClient = () => {
  const redis = getRedisClient();
  if (!redis) {
    throw ApiError.serviceUnavailable("Cache service unavailable");
  }
  return redis;
};

/**
 * Builds a Redis key using required global format.
 * @param {string} module
 * @param {string} type
 * @param {string} identifier
 * @returns {string}
 */
const buildGlobalKey = (module, type, identifier) => {
  const env = config.app.env;
  return `${env}:global:${module}:${type}:${identifier}`;
};

/**
 * Centralized Redis key builder for auth module.
 */
export const authRedisKeys = Object.freeze({
  emailVerifyToken: (token) => buildGlobalKey("auth", "emailVerify", token),
  refresh: (refreshId) => buildGlobalKey("auth", "refresh", refreshId),
  userRefreshSet: (userId) => buildGlobalKey("auth", "user_refresh_set", userId),
  passwordReset: (token) => buildGlobalKey("auth", "pwdreset", token),
  tenantOwnerInvite: (token) => buildGlobalKey("auth", "tenant_owner_invite", token),
  rateLoginIp: (ip) => buildGlobalKey("rate", "ip", `${ip}:login`),
  rateOtpSend: (email) => buildGlobalKey("rate", "otp_send", email),
  session: (sessionId) => buildGlobalKey("auth", "session", sessionId),
  sessionRevoked: (sessionId) => buildGlobalKey("auth", "session_revoked", sessionId),
  platformInviteRevoked: (userId) => buildGlobalKey("auth", "platform_invite_revoked", userId)
});

/**
 * Stores an email verification token mapped to userId.
 * Token TTL: 24 hours.
 * @param {string} token  - raw 32-byte hex token (64 chars)
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const setVerifyEmailToken = async (token, userId) => {
  const redis = requireRedisClient();
  await redis.setEx(authRedisKeys.emailVerifyToken(token), EMAIL_VERIFY_TOKEN_TTL_SECONDS, userId);
};

/**
 * Retrieves the userId associated with an email verification token.
 * @param {string} token
 * @returns {Promise<string | null>}
 */
export const getVerifyEmailToken = async (token) => {
  const redis = requireRedisClient();
  return redis.get(authRedisKeys.emailVerifyToken(token));
};

/**
 * Deletes an email verification token after it has been used.
 * @param {string} token
 * @returns {Promise<void>}
 */
export const deleteVerifyEmailToken = async (token) => {
  const redis = requireRedisClient();
  await redis.del(authRedisKeys.emailVerifyToken(token));
};

/**
 * Stores hashed refresh token record.
 * @param {string} refreshId
 * @param {{ userId: string, tokenHash: string, sessionTokenId: string, deviceId: string }} payload
 * @returns {Promise<void>}
 */
export const setRefreshRecord = async (refreshId, payload) => {
  const redis = requireRedisClient();
  const key = authRedisKeys.refresh(refreshId);
  await redis.setEx(key, REFRESH_TTL_SECONDS, JSON.stringify(payload));
};

/**
 * Fetches refresh token record by id.
 * @param {string} refreshId
 * @returns {Promise<{ userId: string, tokenHash: string, sessionTokenId: string, deviceId: string } | null>}
 */
export const getRefreshRecord = async (refreshId) => {
  const redis = requireRedisClient();
  const raw = await redis.get(authRedisKeys.refresh(refreshId));
  if (!raw) return null;
  return JSON.parse(raw);
};

/**
 * Deletes refresh token record by id.
 * @param {string} refreshId
 * @returns {Promise<void>}
 */
export const deleteRefreshRecord = async (refreshId) => {
  const redis = requireRedisClient();
  await redis.del(authRedisKeys.refresh(refreshId));
};

/**
 * Adds refresh id into user refresh-id set.
 * @param {string} userId
 * @param {string} refreshId
 * @returns {Promise<void>}
 */
export const addUserRefreshId = async (userId, refreshId) => {
  const redis = requireRedisClient();
  await redis.sAdd(authRedisKeys.userRefreshSet(userId), refreshId);
};

/**
 * Removes refresh id from user refresh-id set.
 * @param {string} userId
 * @param {string} refreshId
 * @returns {Promise<void>}
 */
export const removeUserRefreshId = async (userId, refreshId) => {
  const redis = requireRedisClient();
  await redis.sRem(authRedisKeys.userRefreshSet(userId), refreshId);
};

/**
 * Lists all refresh ids for user.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export const getUserRefreshIds = async (userId) => {
  const redis = requireRedisClient();
  return redis.sMembers(authRedisKeys.userRefreshSet(userId));
};

/**
 * Clears user refresh-id set.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const clearUserRefreshSet = async (userId) => {
  const redis = requireRedisClient();
  await redis.del(authRedisKeys.userRefreshSet(userId));
};

/**
 * Deletes multiple refresh keys using pipeline.
 * @param {string[]} refreshIds
 * @returns {Promise<void>}
 */
export const deleteManyRefreshRecords = async (refreshIds) => {
  if (!refreshIds.length) return;
  const redis = requireRedisClient();
  const multi = redis.multi();
  for (const refreshId of refreshIds) {
    multi.del(authRedisKeys.refresh(refreshId));
  }
  await multi.exec();
};

/**
 * Stores password reset token.
 * @param {string} token
 * @param {string} userId
 * @param {number} [ttlSeconds] - optional TTL (default: 15 min; use PLATFORM_INVITE_TTL_SECONDS for invites)
 * @returns {Promise<void>}
 */
export const setPasswordResetToken = async (token, userId, ttlSeconds = PASSWORD_RESET_TTL_SECONDS) => {
  const redis = requireRedisClient();
  await redis.setEx(authRedisKeys.passwordReset(token), ttlSeconds, userId);
};

export { PLATFORM_INVITE_TTL_SECONDS };

const TENANT_OWNER_INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Stores tenant-owner invite token -> inviteId (PendingTenantInvite _id).
 * @param {string} token
 * @param {string} inviteId
 * @returns {Promise<void>}
 */
export const setTenantOwnerInviteToken = async (token, inviteId) => {
  const redis = requireRedisClient();
  await redis.setEx(
    authRedisKeys.tenantOwnerInvite(token),
    TENANT_OWNER_INVITE_TTL_SECONDS,
    inviteId
  );
};

/**
 * Gets inviteId for tenant-owner invite token.
 * @param {string} token
 * @returns {Promise<string | null>}
 */
export const getTenantOwnerInviteId = async (token) => {
  const redis = requireRedisClient();
  return redis.get(authRedisKeys.tenantOwnerInvite(token));
};

/**
 * Deletes tenant-owner invite token after use.
 * @param {string} token
 * @returns {Promise<void>}
 */
export const deleteTenantOwnerInviteToken = async (token) => {
  const redis = requireRedisClient();
  await redis.del(authRedisKeys.tenantOwnerInvite(token));
};

/**
 * Fetches password reset token owner.
 * @param {string} token
 * @returns {Promise<string | null>}
 */
export const getPasswordResetUserId = async (token) => {
  const redis = requireRedisClient();
  return redis.get(authRedisKeys.passwordReset(token));
};

/**
 * Deletes password reset token.
 * @param {string} token
 * @returns {Promise<void>}
 */
export const deletePasswordResetToken = async (token) => {
  const redis = requireRedisClient();
  await redis.del(authRedisKeys.passwordReset(token));
};

const PLATFORM_INVITE_REVOKED_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Marks platform invite as revoked (invalidates set-password link).
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const setPlatformInviteRevoked = async (userId) => {
  const redis = requireRedisClient();
  await redis.setEx(authRedisKeys.platformInviteRevoked(userId), PLATFORM_INVITE_REVOKED_TTL_SECONDS, "1");
};

/**
 * Checks if platform invite was revoked.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export const getPlatformInviteRevoked = async (userId) => {
  const redis = getRedisClient();
  if (!redis?.isOpen) return false;
  const val = await redis.get(authRedisKeys.platformInviteRevoked(userId));
  return val !== null;
};

/**
 * Increments login attempts counter for ip.
 * @param {string} ip
 * @param {number} ttlSeconds
 * @returns {Promise<number>}
 */
export const incrementLoginRateLimit = async (ip, ttlSeconds) => {
  const redis = requireRedisClient();
  const key = authRedisKeys.rateLoginIp(ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
};

/**
 * Increments OTP send attempts counter for email.
 * @param {string} email
 * @param {number} ttlSeconds
 * @returns {Promise<number>}
 */
export const incrementOtpSendRateLimit = async (email, ttlSeconds) => {
  const redis = requireRedisClient();
  const key = authRedisKeys.rateOtpSend(email);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
};
