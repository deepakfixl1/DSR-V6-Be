/**
 * Stripe webhook routes. Uses raw body for signature verification.
 * Mount BEFORE express.json() or use express.raw() for this path.
 */

import { Router } from "express";
import express from "express";
import * as webhookController from "#api/modules/billing/billing.webhook.controller.js";

/**
 * @returns {import("express").Router}
 */
export const createBillingWebhookRoutes = () => {
  const router = Router();
  router.post(
    "/",
    express.raw({ type: "application/json" }),
    webhookController.handleWebhook
  );
  return router;
};
