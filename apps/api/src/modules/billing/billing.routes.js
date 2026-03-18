/**
 * Billing routes. Plan management (admin) and tenant subscription.
 */

import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import {
  createPlanSchema,
  updatePlanSchema,
  togglePlanSchema,
  deletePlanSchema,
  listPlansSchema,
  listInvoicesSchema,
  getAnalyticsSchema,
  getSubscriptionSchema,
  subscribeSchema,
  upgradeSchema,
  cancelSchema,
  resumeSchema,
  checkoutSessionSchema,
  portalSessionSchema,
} from "#api/modules/billing/billing.validation.js";
import * as billingController from "#api/modules/billing/billing.controller.js";

/**
 * @param {{ billingController: typeof billingController }} deps
 * @returns {import("express").Router}
 */
export const createBillingRoutes = ({ billingController }) => {
  const router = Router();

  router.use(authenticate());

  // Admin plan management
  router.get(
    "/plans",
    validate(listPlansSchema),
    billingController.listPlans
  );
  router.post(
    "/plans",
    requireAdmin(),
    validate(createPlanSchema),
    billingController.createPlan
  );
  router.patch(
    "/plans/:planId",
    requireAdmin(),
    validate(updatePlanSchema),
    billingController.updatePlan
  );
  router.patch(
    "/plans/:planId/toggle",
    requireAdmin(),
    validate(togglePlanSchema),
    billingController.togglePlan
  );
  router.delete(
    "/plans/:planId",
    requireAdmin(),
    validate(deletePlanSchema),
    billingController.deletePlan
  );

  // Admin-only billing views
  router.get(
    "/invoices",
    requireAdmin(),
    validate(listInvoicesSchema),
    billingController.listInvoices
  );
  router.get(
    "/analytics",
    requireAdmin(),
    validate(getAnalyticsSchema),
    billingController.getAnalytics
  );

  // Tenant subscription (authenticated, ownership validated in service)
  router.get(
    "/:tenantId/subscription",
    validate(getSubscriptionSchema),
    billingController.getSubscription
  );
  router.get(
    "/:tenantId/invoices",
    validate(getSubscriptionSchema),
    billingController.listTenantInvoices
  );
  router.post(
    "/:tenantId/create-checkout-session",
    validate(checkoutSessionSchema),
    billingController.createCheckoutSession
  );
  router.post(
    "/:tenantId/create-portal-session",
    validate(portalSessionSchema),
    billingController.createPortalSession
  );
  router.post(
    "/:tenantId/subscribe",
    validate(subscribeSchema),
    billingController.subscribe
  );
  router.post(
    "/:tenantId/upgrade",
    validate(upgradeSchema),
    billingController.upgrade
  );
  router.post(
    "/:tenantId/cancel",
    validate(cancelSchema),
    billingController.cancel
  );
  router.post(
    "/:tenantId/resume",
    validate(resumeSchema),
    billingController.resume
  );

  return router;
};
