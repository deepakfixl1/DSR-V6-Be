import { config } from "#api/config/env.js";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cross-origin detection: if any configured frontend URL is on a different host
// from the backend's public URL, we MUST use SameSite=None + Secure so browsers
// actually send cookies cross-origin. This is needed even in development when
// frontends are deployed to Vercel while the backend is on Render.
const _backendHost = (() => {
  try { return new URL(config.app.publicUrl || "http://localhost").hostname; } catch { return "localhost"; }
})();
const _frontendHosts = [
  config.app.tenantPlatformUrl,
  config.app.superAdminUrl,
  config.app.landingPageUrl,
].map((u) => { try { return new URL(u).hostname; } catch { return "localhost"; } });
const _isCrossOrigin = _frontendHosts.some((h) => h !== _backendHost && h !== "localhost");

// Use SameSite=None + Secure when: production mode OR cross-origin deployment detected
const _needsCrossOriginCookies = config.app.isProduction || _isCrossOrigin;

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  sameSite: _needsCrossOriginCookies ? "none" : "lax",
  secure: _needsCrossOriginCookies,
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
  const base = { httpOnly: true, sameSite: COOKIE_OPTS_BASE.sameSite, secure: COOKIE_OPTS_BASE.secure };
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
