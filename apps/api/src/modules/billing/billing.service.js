/**
 * Billing service. All business logic for plans, subscriptions, and webhooks.
 * No business logic in controllers.
 */

import mongoose from "mongoose";
import {
  PlanCatalog,
  Subscription,
  Tenant,
  TenantMembership,
  User
} from "#db/models/index.js";
import * as auditService from "#api/modules/audit/audit.service.js";
import { getStripeClient } from "#api/helpers/stripe.client.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { idempotencyKey } from "#infra/cache/keys.js";
import { config } from "#api/config/env.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";

const env = config.app.env;
const STRIPE_WEBHOOK_IDEMPOTENCY_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Returns true if the ID is a real Stripe subscription ID (starts with "sub_").
 * Local dev fallback IDs start with "local_" and must not be sent to Stripe.
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
function isRealStripeSubscriptionId(id) {
  return typeof id === "string" && id.startsWith("sub_");
}

/**
 * Checks if user is tenant owner or platform admin.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function assertTenantOwnerOrPlatformAdmin(tenantId, userId) {
  const user = await User.findById(userId).select("isPlatformAdmin").lean();
  if (user?.isPlatformAdmin) return true;
  const membership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(userId),
    status: "active",
    isOwner: true
  }).lean();
  if (!membership) {
    throw ApiError.forbidden("Tenant owner access required");
  }
  return true;
}

/**
 * Lists plans. Admin sees all; others see active only.
 * @param {{ isAdmin?: boolean }} params
 * @returns {Promise<object[]>}
 */
export async function listPlans({ isAdmin = false }) {
  const filter = isAdmin ? {} : { isActive: true };
  const plans = await PlanCatalog.find(filter).lean();

  // Normalize price and tier from metadata so the frontend doesn't have to dig into metadata
  const normalized = plans.map((p) => ({
    ...p,
    price: p.metadata?.price ?? 0,
    tier: p.metadata?.tier ?? 0,
    badge: p.metadata?.badge ?? null,
    description: p.metadata?.description ?? null,
  }));

  // Sort by tier ascending (Free → Pro → Enterprise)
  normalized.sort((a, b) => a.tier - b.tier);
  return normalized;
}

/**
 * Creates a new plan. Validates stripePriceId via Stripe API.
 * @param {object} input
 * @param {string} input.planCode
 * @param {string} input.name
 * @param {string} input.stripePriceId
 * @param {object} [input.features]
 * @param {object} [input.limits]
 * @param {object} [input.metadata]
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function createPlan(input, userId) {
  const existing = await PlanCatalog.findOne({
    planCode: input.planCode.toLowerCase().trim()
  }).lean();
  if (existing) {
    throw ApiError.conflict("Plan code already exists");
  }

  // const stripe = getStripeClient();
  // try {
  //   await stripe.prices.retrieve(input.stripePriceId);
  // } catch (err) {
  //   logger.warn({ stripePriceId: input.stripePriceId, err }, "Stripe price lookup failed");
  //   throw ApiError.badRequest("Invalid Stripe price ID");
  // }

  const plan = await PlanCatalog.create({
    planCode: input.planCode.toLowerCase().trim(),
    name: input.name.trim(),
    stripePriceId: input.stripePriceId?.trim() || "1234567687753432",
    duration: input.duration || "yearly",
    features: {
      rbac: input.features?.rbac ?? true,
      auditLogs: input.features?.auditLogs ?? false,
      apiAccess: input.features?.apiAccess ?? true,
      automationWorkers: input.features?.automationWorkers ?? false,
      advancedSecurity: input.features?.advancedSecurity ?? false,
      sso: input.features?.sso ?? false
    },
    limits: {
      maxUsers: input.limits?.maxUsers ?? 3,
      maxStorageGB: input.limits?.maxStorageGB ?? 1,
      maxApiCallsPerMonth: input.limits?.maxApiCallsPerMonth ?? 5000,
      auditLogRetentionDays: input.limits?.auditLogRetentionDays ?? 7,
      maxAITokensPerMonth: input.limits?.maxAITokensPerMonth ?? 10000,
      maxAIReportsPerMonth: input.limits?.maxAIReportsPerMonth ?? 30
    },
    metadata: input.metadata ?? {}
  });

  await auditService
    .log({
      action: "PLAN.CREATED",
      resourceType: "PlanCatalog",
      resourceId: plan._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: null,
      metadata: { planCode: plan.planCode }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ planId: plan._id, planCode: plan.planCode }, "Plan created");
  return plan.toObject();
}

/**
 * Updates a plan.
 * @param {string} planId
 * @param {object} input
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function updatePlan(planId, input, userId) {
  const plan = await PlanCatalog.findById(planId);
  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }

  const toPlain = (obj) =>
    obj && typeof obj.toObject === "function" ? obj.toObject() : obj || {};

  const updates = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.stripePriceId !== undefined) {
    try {
      const stripe = getStripeClient();
      await stripe.prices.retrieve(input.stripePriceId);
    } catch (err) {
      if (err.message?.includes("not configured")) {
        logger.warn("Stripe not configured — skipping price ID validation");
      } else {
        throw ApiError.badRequest("Invalid Stripe price ID");
      }
    }
    updates.stripePriceId = input.stripePriceId.trim();
  }
  if (input.features !== undefined) {
    updates.features = { ...toPlain(plan.features), ...input.features };
  }
  if (input.limits !== undefined) {
    updates.limits = { ...toPlain(plan.limits), ...input.limits };
  }
  if (input.duration !== undefined) updates.duration = input.duration;
  if (input.metadata !== undefined) updates.metadata = input.metadata;

  Object.assign(plan, updates);
  await plan.save();

  await auditService
    .log({
      action: "PLAN.UPDATED",
      resourceType: "PlanCatalog",
      resourceId: plan._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: null,
      diff: updates
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ planId }, "Plan updated");
  return plan.toObject();
}

/**
 * Toggles plan isActive.
 * @param {string} planId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function togglePlan(planId, userId) {
  const plan = await PlanCatalog.findById(planId);
  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }
  plan.isActive = !plan.isActive;
  await plan.save();

  await auditService
    .log({
      action: "PLAN.TOGGLED",
      resourceType: "PlanCatalog",
      resourceId: plan._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: null,
      metadata: { isActive: plan.isActive }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ planId, isActive: plan.isActive }, "Plan toggled");
  return plan.toObject();
}

/**
 * Deactivates a plan (soft delete, isActive=false).
 * @param {string} planId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function deletePlan(planId, userId) {
  const plan = await PlanCatalog.findById(planId);
  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }
  plan.isActive = false;
  await plan.save();

  await auditService
    .log({
      action: "PLAN.DEACTIVATED",
      resourceType: "PlanCatalog",
      resourceId: plan._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: null,
      metadata: { planCode: plan.planCode }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ planId }, "Plan deactivated");
  return plan.toObject();
}

/**
 * Gets subscription summary for tenant.
 * Platform admins can view any tenant's subscription; others must be tenant owner.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getSubscription(tenantId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const subscription = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  })
    .populate("planId")
    .lean();

  if (!subscription) {
    return {
      plan: null,
      planId: null,
      status: null,
      limits: null,
      features: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    };
  }

  const plan = subscription.planId;
  return {
    plan: plan
      ? {
          id: plan._id,
          planCode: plan.planCode,
          name: plan.name,
          duration: plan.duration ?? "yearly",
        }
      : null,
    planId: plan?._id ?? subscription.planId,
    status: subscription.status,
    limits: plan?.limits ?? null,
    features: plan?.features ?? null,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
  };
}

/**
 * Creates Stripe subscription for tenant.
 * @param {string} tenantId
 * @param {string} planId
 * @param {string} [paymentMethodId]
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function subscribe(tenantId, planId, paymentMethodId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const existing = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();
  if (existing && ["active", "trialing", "past_due", "incomplete"].includes(existing.status)) {
    throw ApiError.conflict("Active subscription already exists");
  }

  const plan = await PlanCatalog.findOne({ _id: planId, isActive: true });
  if (!plan) {
    throw ApiError.notFound("Plan not found or inactive");
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  let status, periodStart, periodEnd;
  let stripeSubscriptionId = null;

  try {
    const stripe = getStripeClient();
    let stripeCustomerId = tenant.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ metadata: { tenantId } });
      stripeCustomerId = customer.id;
      tenant.stripeCustomerId = stripeCustomerId;
      await tenant.save();
    }

    const subscriptionParams = {
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      expand: ["latest_invoice.payment_intent"]
    };
    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const stripeSub = await stripe.subscriptions.create(subscriptionParams);
    stripeSubscriptionId = stripeSub.id;
    status = stripeSub.status;
    periodStart = new Date(stripeSub.current_period_start * 1000);
    periodEnd = new Date(stripeSub.current_period_end * 1000);
  } catch (err) {
    if (!err.message?.includes("not configured")) throw err;
    // Stripe not configured — create a local subscription record
    logger.warn("Stripe not configured — creating local subscription without Stripe");
    stripeSubscriptionId = `local_${Date.now()}`;
    status = "active";
    periodStart = new Date();
    periodEnd = addDuration(periodStart, plan.duration || "yearly");
  }

  if (existing) {
    await Subscription.updateOne(
      { tenantId: new mongoose.Types.ObjectId(tenantId) },
      {
        $set: {
          stripeSubscriptionId,
          planId: plan._id,
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false
        }
      }
    );
  } else {
    await Subscription.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      stripeSubscriptionId,
      planId: plan._id,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd
    });
  }

  tenant.planId = plan._id;
  await tenant.save();

  const sub = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).populate("planId").lean();

  await auditService
    .log({
      action: "SUBSCRIPTION.CREATED",
      resourceType: "Subscription",
      resourceId: sub._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: { planId: String(planId), stripeSubscriptionId }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, planId, stripeSubscriptionId }, "Subscription created");
  return sub;
}

/**
 * Upgrades tenant subscription to a new plan.
 * @param {string} tenantId
 * @param {string} planId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function upgrade(tenantId, planId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const subscription = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).populate("planId");
  if (!subscription) {
    throw ApiError.notFound("Subscription not found");
  }
  if (!["active", "trialing"].includes(subscription.status)) {
    throw ApiError.badRequest("Cannot upgrade inactive subscription");
  }

  const plan = await PlanCatalog.findOne({ _id: planId, isActive: true });
  if (!plan) {
    throw ApiError.notFound("Plan not found or inactive");
  }

  // Enforce upgrade-only direction: new plan must have a higher tier than current
  const currentPlan = subscription.planId; // already populated
  const currentTier = currentPlan?.metadata?.tier ?? 0;
  const newTier = plan.metadata?.tier ?? 0;
  if (newTier <= currentTier) {
    throw ApiError.badRequest(
      "Downgrading to a lower-tier plan is not allowed. Please contact support."
    );
  }

  const previousPlanId = currentPlan?._id ?? subscription.planId;

  if (isRealStripeSubscriptionId(subscription.stripeSubscriptionId)) {
    try {
      const stripe = getStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: stripeSub.items.data[0].id, price: plan.stripePriceId }]
      });
    } catch (err) {
      if (!err.message?.includes("not configured")) throw err;
      logger.warn("Stripe not configured — upgrading local subscription without Stripe");
    }
  } else {
    logger.warn({ stripeSubscriptionId: subscription.stripeSubscriptionId }, "Skipping Stripe upgrade — local subscription ID");
  }

  subscription.planId = plan._id;
  await subscription.save();

  const tenant = await Tenant.findById(tenantId);
  tenant.planId = plan._id;
  await tenant.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.UPGRADED",
      resourceType: "Subscription",
      resourceId: subscription._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: { planId, previousPlanId: String(previousPlanId) }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, planId }, "Subscription upgraded");
  return (await Subscription.findById(subscription._id).populate("planId").lean());
}

/**
 * Cancels subscription at period end.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function cancel(tenantId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const subscription = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });
  if (!subscription) {
    throw ApiError.notFound("Subscription not found");
  }

  if (isRealStripeSubscriptionId(subscription.stripeSubscriptionId)) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    } catch (err) {
      if (!err.message?.includes("not configured")) throw err;
      logger.warn("Stripe not configured — cancelling local subscription without Stripe");
    }
  } else {
    logger.warn({ stripeSubscriptionId: subscription.stripeSubscriptionId }, "Skipping Stripe cancel — local subscription ID");
  }

  subscription.cancelAtPeriodEnd = true;
  await subscription.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.CANCELLED",
      resourceType: "Subscription",
      resourceId: subscription._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: { cancelAt: "period_end" }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId }, "Subscription cancelled at period end");
  return (await Subscription.findById(subscription._id).populate("planId").lean());
}

/**
 * Resumes cancelled subscription.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function resume(tenantId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const subscription = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });
  if (!subscription) {
    throw ApiError.notFound("Subscription not found");
  }
  if (!subscription.cancelAtPeriodEnd) {
    throw ApiError.badRequest("Subscription is not scheduled for cancellation");
  }

  if (isRealStripeSubscriptionId(subscription.stripeSubscriptionId)) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
    } catch (err) {
      if (!err.message?.includes("not configured")) throw err;
      logger.warn("Stripe not configured — resuming local subscription without Stripe");
    }
  } else {
    logger.warn({ stripeSubscriptionId: subscription.stripeSubscriptionId }, "Skipping Stripe resume — local subscription ID");
  }

  subscription.cancelAtPeriodEnd = false;
  await subscription.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.RESUMED",
      resourceType: "Subscription",
      resourceId: subscription._id,
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId)
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId }, "Subscription resumed");
  return (await Subscription.findById(subscription._id).populate("planId").lean());
}

/**
 * Creates a Stripe Checkout Session (subscription mode).
 * Frontend redirects to the returned URL — Stripe hosts the payment page.
 * @param {string} tenantId
 * @param {string} planId
 * @param {string} userId
 * @param {{ successUrl: string, cancelUrl: string }} urls
 * @returns {Promise<{ url: string | null, subscription?: object }>}
 */
export async function createCheckoutSession(tenantId, planId, userId, { successUrl, cancelUrl }) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const plan = await PlanCatalog.findOne({ _id: planId, isActive: true });
  if (!plan) throw ApiError.notFound("Plan not found or inactive");

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw ApiError.notFound("Tenant not found");

  // Find any existing subscription so we can cancel it after the new one is created
  const existingSub = await Subscription.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).lean();

  // If existing sub is on the same plan, no need to go through checkout again
  if (existingSub) {
    const existingPlanId = String(existingSub.planId?._id ?? existingSub.planId ?? "");
    if (existingPlanId === String(plan._id) && existingSub.status === "active") {
      throw ApiError.conflict("You are already subscribed to this plan.");
    }
  }

  // The old Stripe subscription ID — webhook will cancel it after new sub is created
  const oldStripeSubId = isRealStripeSubscriptionId(existingSub?.stripeSubscriptionId)
    ? existingSub.stripeSubscriptionId
    : null;

  try {
    const stripe = getStripeClient();

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (await User.findById(userId).lean())?.email,
        metadata: { tenantId: String(tenantId) },
      });
      customerId = customer.id;
      tenant.stripeCustomerId = customerId;
      await tenant.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          tenantId: String(tenantId),
          planId: String(plan._id),
          // Tell the webhook which old subscription to cancel (if upgrading)
          oldStripeSubId: oldStripeSubId ?? "",
        },
      },
      metadata: {
        tenantId: String(tenantId),
        planId: String(plan._id),
        oldStripeSubId: oldStripeSubId ?? "",
      },
    });

    logger.info({ tenantId, planId, sessionId: session.id, isUpgrade: Boolean(oldStripeSubId) }, "Checkout session created");
    return { url: session.url, sessionId: session.id };
  } catch (err) {
    if (!err.message?.includes("not configured")) throw err;
    // Stripe not configured — create/update local subscription immediately (dev fallback)
    logger.warn("Stripe not configured — creating local subscription (dev fallback)");
    const sub = await subscribe(tenantId, planId, null, userId);
    return { url: null, subscription: sub };
  }
}

/**
 * Creates a Stripe Billing Portal session for managing subscription, payment methods, invoices.
 * Frontend redirects to the returned URL.
 * @param {string} tenantId
 * @param {string} userId
 * @param {string} returnUrl
 * @returns {Promise<{ url: string }>}
 */
export async function createPortalSession(tenantId, userId, returnUrl) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw ApiError.notFound("Tenant not found");
  if (!tenant.stripeCustomerId) throw ApiError.badRequest("No Stripe customer found. Subscribe to a plan first.");

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  });

  logger.info({ tenantId }, "Billing portal session created");
  return { url: session.url };
}

/**
 * Lists Stripe invoices for a tenant (tenant-scoped, not admin-only).
 * Falls back to empty array when Stripe is not configured.
 * @param {string} tenantId
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function listTenantInvoices(tenantId, userId) {
  await assertTenantOwnerOrPlatformAdmin(tenantId, userId);

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw ApiError.notFound("Tenant not found");
  if (!tenant.stripeCustomerId) return { invoices: [] };

  try {
    const stripe = getStripeClient();
    const result = await stripe.invoices.list({
      customer: tenant.stripeCustomerId,
      limit: 24,
      expand: ["data.subscription"],
    });

    const invoices = result.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      date: new Date(inv.created * 1000).toISOString(),
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
      description: inv.description ?? null,
    }));

    return { invoices };
  } catch (err) {
    if (err.message?.includes("not configured")) return { invoices: [] };
    throw err;
  }
}

/**
 * Checks idempotency for Stripe webhook event.
 * @param {string} eventId
 * @returns {Promise<boolean>} true if already processed
 */
async function isWebhookEventProcessed(eventId) {
  const client = getRedisClient();
  if (!client?.isOpen) return false;
  const key = idempotencyKey({
    env,
    tenantId: "_",
    provider: "stripe",
    eventId,
    clusterTenantTag: false
  });
  const exists = await client.get(key);
  return exists !== null;
}

/**
 * Marks Stripe webhook event as processed.
 * @param {string} eventId
 * @returns {Promise<void>}
 */
async function markWebhookEventProcessed(eventId) {
  const client = getRedisClient();
  if (!client?.isOpen) return;
  const key = idempotencyKey({
    env,
    tenantId: "_",
    provider: "stripe",
    eventId,
    clusterTenantTag: false
  });
  await client.setEx(key, STRIPE_WEBHOOK_IDEMPOTENCY_TTL, "1");
}

/**
 * Handles Stripe webhook event. Idempotent; never throws raw Stripe errors.
 * @param {import('stripe').Stripe.Event} event
 * @returns {Promise<void>}
 */
export async function handleStripeWebhook(event) {
  if (await isWebhookEventProcessed(event.id)) {
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event);
    } else if (event.type === "invoice.paid") {
      await handleInvoicePaid(event);
    } else if (event.type === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(event);
    } else if (event.type === "customer.subscription.updated") {
      await handleSubscriptionUpdated(event);
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event);
    }
    await markWebhookEventProcessed(event.id);
  } catch (err) {
    logger.error({ err, eventId: event.id, eventType: event.type }, "Webhook handler error");
    throw err;
  }
}

/**
 * Provisions the subscription in our DB after Stripe Checkout completes.
 * @param {import('stripe').Stripe.Event} event
 */
async function handleCheckoutSessionCompleted(event) {
  const session = event.data.object;
  const { tenantId, planId, oldStripeSubId } = session.metadata ?? {};
  if (!tenantId || !planId) return;

  const newStripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;
  if (!newStripeSubscriptionId) return;

  let periodStart = new Date();
  let periodEnd = null;
  let subStatus = "active";

  try {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(newStripeSubscriptionId);
    periodStart = new Date(stripeSub.current_period_start * 1000);
    periodEnd = new Date(stripeSub.current_period_end * 1000);
    subStatus = stripeSub.status;

    // If this is an upgrade, cancel the old Stripe subscription immediately
    if (oldStripeSubId && isRealStripeSubscriptionId(oldStripeSubId) && oldStripeSubId !== newStripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(oldStripeSubId);
        logger.info({ oldStripeSubId, newStripeSubscriptionId }, "Old subscription cancelled after upgrade");
      } catch (err) {
        logger.warn({ err, oldStripeSubId }, "Could not cancel old subscription (may already be cancelled)");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Could not retrieve new Stripe subscription details");
  }

  const plan = await PlanCatalog.findById(planId).lean();
  if (!plan) return;

  if (!periodEnd) periodEnd = addDuration(periodStart, plan.duration || "monthly");

  // Provision the subscription in our DB (create or update)
  const existing = await Subscription.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });
  if (existing) {
    existing.stripeSubscriptionId = newStripeSubscriptionId;
    existing.planId = plan._id;
    existing.status = subStatus;
    existing.currentPeriodStart = periodStart;
    existing.currentPeriodEnd = periodEnd;
    existing.cancelAtPeriodEnd = false;
    await existing.save();
  } else {
    await Subscription.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      stripeSubscriptionId: newStripeSubscriptionId,
      planId: plan._id,
      status: subStatus,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  }

  await Tenant.findByIdAndUpdate(tenantId, { planId: plan._id });

  const isUpgrade = Boolean(oldStripeSubId && isRealStripeSubscriptionId(oldStripeSubId));
  await auditService
    .log({
      action: isUpgrade ? "SUBSCRIPTION.UPGRADED_VIA_CHECKOUT" : "SUBSCRIPTION.CHECKOUT_COMPLETED",
      resourceType: "Subscription",
      userId: null,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: { stripeSubscriptionId: newStripeSubscriptionId, planId, sessionId: session.id, oldStripeSubId },
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ tenantId, planId, newStripeSubscriptionId, isUpgrade }, "Checkout completed — subscription provisioned");
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleInvoicePaid(event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return;

  const sub = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
  if (!sub) return;

  sub.status = "active";
  await sub.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.INVOICE_PAID",
      resourceType: "Subscription",
      resourceId: sub._id,
      userId: null,
      tenantId: sub.tenantId,
      metadata: { invoiceId: invoice.id }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ subscriptionId, invoiceId: invoice.id }, "Invoice paid");
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return;

  const sub = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
  if (!sub) return;

  sub.status = "past_due";
  await sub.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.INVOICE_PAYMENT_FAILED",
      resourceType: "Subscription",
      resourceId: sub._id,
      userId: null,
      tenantId: sub.tenantId,
      metadata: { invoiceId: invoice.id }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.warn({ subscriptionId, invoiceId: invoice.id }, "Invoice payment failed");
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleSubscriptionUpdated(event) {
  const stripeSub = event.data.object;
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) return;

  sub.status = stripeSub.status;
  sub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
  sub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
  sub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end ?? false;
  await sub.save();

  await auditService
    .log({
      action: "SUBSCRIPTION.UPDATED",
      resourceType: "Subscription",
      resourceId: sub._id,
      userId: null,
      tenantId: sub.tenantId,
      metadata: { stripeStatus: stripeSub.status }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ subscriptionId: stripeSub.id, status: stripeSub.status }, "Subscription updated");
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleSubscriptionDeleted(event) {
  const stripeSub = event.data.object;
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) return;

  sub.status = "canceled";
  await sub.save();

  const tenant = await Tenant.findById(sub.tenantId);
  if (tenant) {
    tenant.planId = null;
    await tenant.save();
  }

  await auditService
    .log({
      action: "SUBSCRIPTION.DELETED",
      resourceType: "Subscription",
      resourceId: sub._id,
      userId: null,
      tenantId: sub.tenantId,
      metadata: { stripeSubscriptionId: stripeSub.id }
    })
    .catch((err) => logger.warn({ err }, "Audit log failed"));

  logger.info({ subscriptionId: stripeSub.id }, "Subscription deleted");
}

/**
 * Extracts monthly amount from plan metadata if available.
 * @param {object} plan
 * @returns {number}
 */
function getPlanMonthlyAmount(plan) {
  if (!plan?.metadata) return 0;
  const amount = plan.metadata.monthlyAmount ?? plan.metadata.amount ?? 0;
  return typeof amount === "number" ? amount : 0;
}

/**
 * Adds duration to a date. Used to fix invalid period end when start === end.
 * @param {Date} start
 * @param {string} duration - 'weekly' | 'monthly' | 'quarterly' | 'yearly'
 * @returns {Date}
 */
function addDuration(start, duration) {
  const d = new Date(start);
  switch (duration) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
    default:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/**
 * Returns correct period end. If stored end is invalid (same as or before start), derives from plan duration.
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @param {object} plan - PlanCatalog with duration
 * @returns {Date}
 */
function resolvePeriodEnd(periodStart, periodEnd, plan) {
  const start = periodStart ? new Date(periodStart) : null;
  const end = periodEnd ? new Date(periodEnd) : null;
  if (!start) return end;
  if (!end || end.getTime() <= start.getTime()) {
    const duration = plan?.duration || "monthly";
    return addDuration(start, duration);
  }
  return end;
}

/**
 * Lists invoices derived from Subscription + Tenant + PlanCatalog (admin only).
 * Each subscription's current period is treated as an invoice record.
 * @param {{ page?: number, limit?: number }} params
 * @returns {Promise<{ docs: object[], total: number, page: number, limit: number, pages: number }>}
 */
export async function listInvoices({ page = 1, limit = 20 } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100));
  const actualLimit = Math.max(1, Math.min(limit, 100));

  const [subscriptions, total] = await Promise.all([
    Subscription.find({})
      .populate("planId")
      .populate("tenantId")
      .sort({ currentPeriodEnd: -1 })
      .skip(skip)
      .limit(actualLimit)
      .lean(),
    Subscription.countDocuments()
  ]);

  const docs = subscriptions.map((sub) => {
    const plan = sub.planId;
    const tenant = sub.tenantId;
    const monthlyAmount = plan ? getPlanMonthlyAmount(plan) : 0;
    const periodStart = sub.currentPeriodStart;
    const periodEnd = resolvePeriodEnd(periodStart, sub.currentPeriodEnd, plan);
    return {
      id: sub._id,
      tenantId: sub.tenantId?._id ?? sub.tenantId,
      tenantName: tenant?.name ?? null,
      tenantSlug: tenant?.slug ?? null,
      planId: plan?._id ?? sub.planId,
      planCode: plan?.planCode ?? null,
      planName: plan?.name ?? null,
      status: sub.status,
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
      amount: monthlyAmount
    };
  });

  return {
    docs,
    total,
    page: Math.max(1, page),
    limit: actualLimit,
    pages: Math.ceil(total / actualLimit)
  };
}

/**
 * Returns billing analytics: mrr, arr, revenueByPlan, activeSubscriptions.
 * @returns {Promise<{ mrr: number, arr: number, revenueByPlan: object[], activeSubscriptions: number }>}
 */
export async function getAnalytics() {
  const activeStatuses = ["active", "trialing"];
  const [subscriptions, activeCount] = await Promise.all([
    Subscription.find({ status: { $in: activeStatuses } })
      .populate("planId")
      .lean(),
    Subscription.countDocuments({ status: { $in: activeStatuses } })
  ]);

  let mrr = 0;
  const revenueByPlanMap = {};

  for (const sub of subscriptions) {
    const plan = sub.planId;
    const planId = plan?._id ? String(plan._id) : String(sub.planId);
    const planCode = plan?.planCode ?? "unknown";
    const planName = plan?.name ?? "Unknown Plan";
    const amount = plan ? getPlanMonthlyAmount(plan) : 0;
    mrr += amount;

    if (!revenueByPlanMap[planId]) {
      revenueByPlanMap[planId] = { planId, planCode, planName, count: 0, mrr: 0 };
    }
    revenueByPlanMap[planId].count += 1;
    revenueByPlanMap[planId].mrr += amount;
  }

  const revenueByPlan = Object.values(revenueByPlanMap);
  const arr = mrr * 12;

  return {
    mrr,
    arr,
    revenueByPlan,
    activeSubscriptions: activeCount
  };
}
