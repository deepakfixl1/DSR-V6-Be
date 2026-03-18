/**
 * Membership controller. No business logic; extracts req data, calls service, returns response.
 */

import * as membershipService from "#api/modules/membership/membership.service.js";
import { getDepartmentFilter } from "#api/middlewares/departmentScope.middleware.js";

/**
 * GET /tenants/:tenantId/members - paginated list of members.
 */
export async function listMembers(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { page, limit, excludePlatformAdmins } = req.validated.query;
    const scope = getDepartmentFilter(req);
    const result = await membershipService.listMembers(tenantId, req.user.id, {
      page,
      limit,
      excludePlatformAdmins,
      departmentId: scope.departmentId ?? undefined,
      selfOnly: Boolean(scope.employeeMemberId),
      selfUserId: scope.employeeMemberId ? req.user.id : undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /tenants/:tenantId/members/me - current user's tenant profile.
 */
export async function getMyTenantProfile(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const result = await membershipService.getMyTenantProfile(tenantId, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /tenants/:tenantId/members/invites - list invites (owner only).
 */
export async function listInvites(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const query = req.validated?.query ?? {};
    const result = await membershipService.listInvites(tenantId, req.user.id, query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /tenants/:tenantId/members/invites/:inviteId/resend - resend invite (owner only).
 */
export async function resendInvite(req, res, next) {
  try {
    const { tenantId, inviteId } = req.validated.params;
    const body = req.validated?.body ?? {};
    const result = await membershipService.resendInvite(tenantId, inviteId, req.user.id, body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /tenants/:tenantId/members/invites/:inviteId - cancel/revoke pending invite.
 */
export async function cancelInvite(req, res, next) {
  try {
    const { tenantId, inviteId } = req.validated.params;
    await membershipService.cancelInvite(tenantId, inviteId, req.user.id, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /tenants/:tenantId/members/invite - invite by email (owner only).
 */
export async function inviteMember(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { email, roleId } = req.validated.body;
    const invite = await membershipService.inviteMember(
      tenantId,
      { email, roleId },
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(201).json(invite);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /tenants/:tenantId/members/accept - accept invite with token.
 */
export async function acceptInvite(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { token } = req.validated.body;
    const result = await membershipService.acceptInvite(
      tenantId,
      token,
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /tenants/:tenantId/members/:userId - update role/team/status (owner only).
 */
export async function updateMembership(req, res, next) {
  try {
    const { tenantId, userId: targetUserId } = req.validated.params;
    const { body } = req.validated;
    const membership = await membershipService.updateMembership(
      tenantId,
      targetUserId,
      body,
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(membership);
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /tenants/:tenantId/members/:userId - remove member (owner only).
 */
export async function removeMember(req, res, next) {
  try {
    const { tenantId, userId: targetUserId } = req.validated.params;
    await membershipService.removeMember(
      tenantId,
      targetUserId,
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /tenants/:tenantId/members/:userId/transfer-ownership - transfer owner (owner only).
 */
export async function transferOwnership(req, res, next) {
  try {
    const { tenantId, userId: newOwnerUserId } = req.validated.params;
    const result = await membershipService.transferOwnership(
      tenantId,
      newOwnerUserId,
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function searchMembers(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await membershipService.searchMembers(tenantId, req.user.id, req.validated.query);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getOrgChart(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await membershipService.getOrgChart(tenantId, req.user.id);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function updateMemberDepartment(req, res, next) {
  try {
    const { tenantId, userId: targetUserId } = req.validated.params;
    const data = await membershipService.updateMemberDepartment(
      tenantId,
      targetUserId,
      req.validated.body.departmentId,
      req.user.id,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getMemberActivity(req, res, next) {
  try {
    const { tenantId, userId: targetUserId } = req.validated.params;
    const data = await membershipService.getMemberActivity(tenantId, targetUserId, req.user.id);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}
