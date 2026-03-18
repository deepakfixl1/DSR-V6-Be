import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "#api/config/env.js";
import { jwtConfig } from "#api/config/jwt.config.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
const ACCESS_SECRET = config.jwt.accessSecret;
const REFRESH_SECRET = config.jwt.refreshSecret;
const ACCESS_EXPIRY = config.jwt.accessExpiry;
const REFRESH_EXPIRY = config.jwt.refreshExpiry;

const HASH_ALGO = "sha256";
const HASH_ENCODING = "hex";

/**
 * Hashes a token for storage (refresh token, OTP).
 * @param {string} value - Plain token or OTP
 * @returns {string} Hex-encoded hash
 */
export function hashToken(value) {
  return crypto.createHash(HASH_ALGO).update(value, "utf8").digest(HASH_ENCODING);
}

/**
 * Compares plain value with stored hash (constant-time).
 * @param {string} plain - Plain value
 * @param {string} hashed - Stored hash
 * @returns {boolean}
 */
export function compareHashedToken(plain, hashed) {
  if (!plain || !hashed) return false;
  const h = crypto.createHash(HASH_ALGO).update(plain, "utf8").digest(HASH_ENCODING);
  return crypto.timingSafeEqual(Buffer.from(h, HASH_ENCODING), Buffer.from(hashed, HASH_ENCODING));
}


export function signAccessToken({ userId, sessionId, jti }) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      jti,
      type: "access"
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

export function signRefreshToken({ userId, sessionId, refreshId }) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      rid: refreshId,
      type: "refresh"
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

/**
 * Verifies access JWT and returns payload.
 * @param {string} token
 * @returns {{ sub: string, tokenId?: string, jti?: string }}
 * @throws {ApiError} 401 if invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    if (decoded.type !== "access") throw new Error("Invalid token type");
    return {
      sub: decoded.sub,
      sid: decoded.sid,
      jti: decoded.jti
    };
  } catch (err) {
    if (err.name === "TokenExpiredError") throw ApiError.unauthorized("Unauthorized");
    if (err.name === "JsonWebTokenError") throw ApiError.unauthorized("Unauthorized");
    throw ApiError.unauthorized("Unauthorized");
  }
}

/**
 * Verifies refresh JWT and returns payload (does not check Redis).
 * @param {string} token
 * @returns {{ sub: string, refreshId: string }}
 * @throws {ApiError} 401 if invalid or expired
 */
export function verifyRefreshToken(token) {
  try {
  
    const decoded = jwt.verify(token, REFRESH_SECRET);

    if (decoded.type !== "refresh") throw new Error("Invalid token type");
    if (!decoded.rid) throw new Error("Missing refreshId");

    return {
      sub: decoded.sub,
      refreshId: decoded.rid,
      sessionId: decoded.sid
    };
  } catch (err) {
    if (err.name === "TokenExpiredError") throw ApiError.unauthorized("Unauthorized");
    if (err.name === "JsonWebTokenError") throw ApiError.unauthorized("Unauthorized");
    throw ApiError.unauthorized("Unauthorized");
  }
}

export { jwtConfig };
