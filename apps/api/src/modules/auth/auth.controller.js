import * as authService from "#api/modules/auth/auth.service.js";
import { setAccessCookie, setRefreshCookie, clearAuthCookies, getRefreshTokenFromCookies } from "#api/modules/auth/auth.cookies.js";
/**
 * POST /auth/signup - create account, send verification email.
 */
export async function signup(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.signup(body);
    return res.status(201).json(result);
  } catch (error) {
    console.log(error);
    return next(error);
  }
}

/**
 * POST /auth/verify-email - verify with OTP.
 */
export async function verifyEmail(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.verifyEmail(body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/resend-verification - resend OTP.
 */
export async function resendVerification(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.resendVerification(body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/login - set httpOnly cookies, return user profile only (no tokens in body).
 */
export async function login(req, res, next) {
  try {
    const { body } = req.validated;
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };
    const { user, accessToken, refreshToken } = await authService.login(body, meta);

  setAccessCookie(res, accessToken);
 setRefreshCookie(res, refreshToken);
 
    return res.status(200).json({ user});
  } catch (error) {
    console.log(error);
    return next(error);
  }
}

/**
 * POST /auth/refresh - rotate refresh token, set new cookies, return 200 (no body or empty).
 */
export async function refresh(req, res, next) {
  try {
    const refreshToken = getRefreshTokenFromCookies(req);
    const meta = { ip: req.ip, userAgent: req.get("user-agent") };
   
    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken, meta);
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({});
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/logout - revoke session, clear cookies.
 */
export async function logout(req, res, next) {
  try {
    const refreshToken = getRefreshTokenFromCookies(req);
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/logout-all - revoke all sessions, clear cookies.
 */
export async function logoutAll(req, res, next) {
  try {
    const refreshToken = getRefreshTokenFromCookies(req);
    await authService.logoutAll(refreshToken);
    clearAuthCookies(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/forgot-password - send reset link.
 */
export async function forgotPassword(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.forgotPassword(body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/reset-password - set new password, revoke sessions.
 */
export async function resetPassword(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.resetPassword(body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /auth/tenant-invite/validate - validate token for tenant owner invite (for set-password page).
 */
export async function validateTenantInvite(req, res, next) {
  try {
    const { token } = req.validated.query;
    const result = await authService.validateTenantInvite({ token });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/tenant-invite/accept - set password and create tenant + owner.
 */
export async function acceptTenantInvite(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await authService.acceptTenantInvite(body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /auth/member-invite/validate - validate token for tenant member invite (for set-password page).
 */
export async function validateMemberInvite(req, res, next) {
  try {
    const { token, tenantId } = req.validated.query;
    const { validateMemberInvite } = await import("#api/modules/membership/membership.service.js");
    const result = await validateMemberInvite(token, tenantId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /auth/member-invite/accept - set password and join tenant (for new users).
 */
export async function acceptMemberInvite(req, res, next) {
  try {
    const { body } = req.validated;
    const { acceptMemberInviteWithPassword } = await import("#api/modules/membership/membership.service.js");
    const result = await acceptMemberInviteWithPassword(body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
