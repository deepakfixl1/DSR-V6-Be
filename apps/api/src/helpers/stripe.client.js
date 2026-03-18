/**
 * Stripe client. Centralized initialization from environment.
 * No Stripe logic in controllers; use billing.service.js.
 */

import Stripe from "stripe";
import { config } from "#api/config/env.js";

/** @type {Stripe | null} */
let stripeInstance = null;

/**
 * Returns the Stripe client instance. Throws if STRIPE_SECRET_KEY is not configured.
 * @returns {Stripe}
 */
export function getStripeClient() {
  if (!config.stripe?.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.stripe.secretKey);
  }
  return stripeInstance;
}
