/**
 * Membership routes. Mount under /tenants/:tenantId so paths are /tenants/:tenantId/members, etc.
 */

import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import {
  requireTenantMembership,
  requireTenantOwner,
} from "#api/middlewares/requireTenantMembership.js";
import {
  listMembersSchema,
  getMyTenantProfileSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMembershipSchema,
  removeMemberSchema,
  transferOwnershipSchema,
  searchMembersSchema,
  getOrgChartSchema,
  updateMemberDepartmentSchema,
  getMemberActivitySchema,
} from "#api/modules/membership/membership.validation.js";
import {
  listInvitesSchema,
  resendInviteSchema,
  cancelInviteSchema,
} from "#api/modules/membership/membership.invites.validation.js";
import { attachDepartmentScope } from "#api/middlewares/departmentScope.middleware.js";
import * as membershipController from "#api/modules/membership/membership.controller.js";

/**
 * @param {{ membershipController: typeof membershipController }} deps
 * @returns {import("express").Router}
 */
export const createMembershipRoutes = ({ membershipController }) => {
  const router = Router({ mergeParams: true });

  router.use(authenticate());

  router.get(
    "/members",
    validate(listMembersSchema),
    requireTenantMembership(),
    attachDepartmentScope(),
    membershipController.listMembers
  );

  router.get("/members/search", validate(searchMembersSchema), requireTenantMembership(), attachDepartmentScope(), membershipController.searchMembers);
  router.get("/org-chart", validate(getOrgChartSchema), requireTenantMembership(), attachDepartmentScope(), membershipController.getOrgChart);

  router.get(
    "/members/me",
    validate(getMyTenantProfileSchema),
    requireTenantMembership(),
    membershipController.getMyTenantProfile
  );

  router.get(
    "/members/invites",
    validate(listInvitesSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.listInvites
  );

  router.post(
    "/members/invites/:inviteId/resend",
    validate(resendInviteSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.resendInvite
  );

  router.delete(
    "/members/invites/:inviteId",
    validate(cancelInviteSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.cancelInvite
  );

  router.post(
    "/members/invite",
    validate(inviteMemberSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.inviteMember
  );

  router.post(
    "/members/accept",
    validate(acceptInviteSchema),
    membershipController.acceptInvite
  );

  router.patch(
    "/members/:userId",
    validate(updateMembershipSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.updateMembership
  );

  router.patch(
    "/members/:userId/department",
    validate(updateMemberDepartmentSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.updateMemberDepartment
  );

  router.get(
    "/members/:userId/activity",
    validate(getMemberActivitySchema),
    requireTenantMembership(),
    membershipController.getMemberActivity
  );

  router.delete(
    "/members/:userId",
    validate(removeMemberSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.removeMember
  );

  router.post(
    "/members/:userId/transfer-ownership",
    validate(transferOwnershipSchema),
    requireTenantMembership(),
    requireTenantOwner(),
    membershipController.transferOwnership
  );

  return router;
};
