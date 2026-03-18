/**
 * Stripe webhook controller. Signature verification and event dispatch.
 * Never exposes raw Stripe errors to client.
 */

import Stripe from "stripe";
import { config } from "#api/config/env.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import * as billingService from "#api/modules/billing/billing.service.js";

/**
 * POST /billing/webhook - Stripe webhook handler.
 * Verifies signature, constructs event, delegates to service.
 */
export async function handleWebhook(req, res, next) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = config.stripe?.webhookSecret;

  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return next(ApiError.serviceUnavailable("Webhook not configured"));
  }

  if (!sig) {
    return next(ApiError.badRequest("Missing Stripe signature"));
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    return next(ApiError.badRequest("Invalid signature"));
  }

  try {
    await billingService.handleStripeWebhook(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error, eventId: event.id }, "Webhook processing failed");
    return next(ApiError.serviceUnavailable("Webhook processing failed"));
  }
}
