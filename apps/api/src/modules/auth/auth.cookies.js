import { config } from "#api/config/env.js";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  // In production we need cross-site cookies (app + api may be on different subdomains),
  // so use SameSite=None + Secure. In local dev (http://localhost) browsers reject
  // SameSite=None cookies without Secure, so use Lax + not secure.
  sameSite: config.app.isProduction ? "none" : "lax",
  secure: config.app.isProduction
};

/**
 * Options for setting access token cookie.
 * @returns {import("express").CookieOptions}
 */
export function getAccessCookieOptions() {
  return {
    ...COOKIE_OPTS_BASE,
    path: "/",
    maxAge: ACCESS_MAX_AGE_MS
  };
}

/**
 * Options for setting refresh token cookie (path restricted to refresh endpoint).
 * @returns {import("express").CookieOptions}
 */
export function getRefreshCookieOptions() {
  return {
    ...COOKIE_OPTS_BASE,
    path: "/",
    maxAge:REFRESH_MAX_AGE_MS
  };
}

/**
 * Sets access_token httpOnly cookie on response.
 * @param {import("express").Response} res
 * @param {string} token
 */
export function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE_NAME, token, getAccessCookieOptions());
}

/**
 * Sets refresh_token httpOnly cookie on response.
 * @param {import("express").Response} res
 * @param {string} token
 */
export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

/**
 * Clears access and refresh cookies (path-aware so both paths are cleared).
 * @param {import("express").Response} res
 */
export function clearAuthCookies(res) {
  const base = { httpOnly: true, sameSite: "none", secure: config.app.isProduction };
  res.clearCookie(ACCESS_COOKIE_NAME, { ...base, path: "/" });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...base, path: "/" });
}

/**
 * Reads access_token from request cookies.
 * @param {import("express").Request} req
 * @returns {string | undefined}
 */
export function getAccessTokenFromCookies(req) {
  return req.cookies?.[ACCESS_COOKIE_NAME];
}

/**
 * Reads refresh_token from request cookies.
 * @param {import("express").Request} req
 * @returns {string | undefined}
 */
export function getRefreshTokenFromCookies(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME];
}
