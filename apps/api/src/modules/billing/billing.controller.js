/**
 * Billing controller. No business logic; delegates to service.
 */

import { User } from "#db/models/index.js";
import * as billingService from "#api/modules/billing/billing.service.js";

/**
 * GET /billing/plans - list plans (admin: all, else: active only).
 */
export async function listPlans(req, res, next) {
  try {
    const user = await User.findById(req.user?.id).select("isPlatformAdmin").lean();
    const isAdmin = user?.isPlatformAdmin ?? false;
    const plans = await billingService.listPlans({ isAdmin });
    return res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/plans - create plan (admin only).
 */
export async function createPlan(req, res, next) {
  try {
    const { body } = req.validated;
    const plan = await billingService.createPlan(body, req.user.id);
    return res.status(201).json(plan);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /billing/plans/:planId - update plan (admin only).
 */
export async function updatePlan(req, res, next) {
  try {
    const { planId } = req.validated.params;
    const { body } = req.validated;
    const plan = await billingService.updatePlan(planId, body, req.user.id);
    return res.status(200).json(plan);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /billing/plans/:planId/toggle - toggle plan isActive (admin only).
 */
export async function togglePlan(req, res, next) {
  try {
    const { planId } = req.validated.params;
    const plan = await billingService.togglePlan(planId, req.user.id);
    return res.status(200).json(plan);
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /billing/plans/:planId - deactivate plan (admin only).
 */
export async function deletePlan(req, res, next) {
  try {
    const { planId } = req.validated.params;
    const plan = await billingService.deletePlan(planId, req.user.id);
    return res.status(200).json(plan);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /billing/:tenantId/subscription - get subscription summary.
 */
export async function getSubscription(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const summary = await billingService.getSubscription(tenantId, req.user.id);
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/subscribe - create subscription.
 */
export async function subscribe(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { planId, paymentMethodId } = req.validated.body;
    const subscription = await billingService.subscribe(
      tenantId,
      planId,
      paymentMethodId,
      req.user.id
    );
    return res.status(201).json(subscription);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/upgrade - upgrade subscription.
 */
export async function upgrade(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { planId } = req.validated.body;
    const subscription = await billingService.upgrade(tenantId, planId, req.user.id);
    return res.status(200).json(subscription);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/cancel - cancel subscription at period end.
 */
export async function cancel(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const subscription = await billingService.cancel(tenantId, req.user.id);
    return res.status(200).json(subscription);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/resume - resume cancelled subscription.
 */
export async function resume(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const subscription = await billingService.resume(tenantId, req.user.id);
    return res.status(200).json(subscription);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/create-checkout-session
 * Creates a Stripe Checkout Session. Frontend redirects to the returned URL.
 */
export async function createCheckoutSession(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { planId, successUrl, cancelUrl } = req.validated.body;
    const result = await billingService.createCheckoutSession(tenantId, planId, req.user.id, {
      successUrl,
      cancelUrl,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /billing/:tenantId/create-portal-session
 * Creates a Stripe Billing Portal session. Frontend redirects to the returned URL.
 */
export async function createPortalSession(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { returnUrl } = req.validated.body;
    const result = await billingService.createPortalSession(tenantId, req.user.id, returnUrl);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /billing/:tenantId/invoices — tenant-scoped Stripe invoices.
 */
export async function listTenantInvoices(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const result = await billingService.listTenantInvoices(tenantId, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /billing/invoices - list invoices (admin only), paginated.
 */
export async function listInvoices(req, res, next) {
  try {
    const { page, limit } = req.validated?.query ?? {};
    const result = await billingService.listInvoices({ page, limit });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /billing/analytics - billing analytics (mrr, arr, revenueByPlan, activeSubscriptions).
 */
export async function getAnalytics(req, res, next) {
  try {
    const analytics = await billingService.getAnalytics();
    return res.status(200).json(analytics);
  } catch (error) {
    return next(error);
  }
}
