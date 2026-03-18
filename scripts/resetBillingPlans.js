/**
 * Reset Billing Plans Script — DSR-V5
 * Deactivates all existing plans and upserts exactly 3 clean plans:
 *   Free (tier 1, $0/mo)
 *   Pro (tier 2, $29/mo)
 *   Enterprise (tier 3, $99/mo)
 *
 * If STRIPE_SECRET_KEY is set, also creates/retrieves Stripe Products + Prices
 * and stores the real Stripe price IDs in the plan documents.
 *
 * Usage (run from backend/ directory):
 *   node scripts/resetBillingPlans.js
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dns from "node:dns";
import dotenv from "dotenv";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import Stripe from "stripe";
import { PlanCatalog } from "#db/models/index.js";

const log = {
  ok:   (msg) => console.log(`  ✅  ${msg}`),
  skip: (msg) => console.log(`  ⏭   ${msg}`),
  info: (msg) => console.log(`  ℹ️   ${msg}`),
  warn: (msg) => console.log(`  ⚠️   ${msg}`),
  err:  (msg, e) => console.error(`  ❌  ${msg}`, e?.message || e),
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set in backend/.env");
  log.info(`Connecting: ${uri.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 3 });
  log.ok("MongoDB connected");
}

/**
 * Creates or retrieves a Stripe Product + Price for a plan.
 * Returns the Stripe price ID.
 */
async function getOrCreateStripePrice(stripe, plan) {
  if (plan.priceUsdCents === 0) {
    log.skip(`${plan.name}: Free plan — no Stripe price needed`);
    return "price_free_no_charge";
  }

  // Look for existing product by metadata
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find((p) => p.metadata?.planCode === plan.planCode);

  if (product) {
    log.skip(`${plan.name}: Stripe product already exists (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: plan.name,
      metadata: { planCode: plan.planCode },
    });
    log.ok(`${plan.name}: Created Stripe product ${product.id}`);
  }

  // Look for existing recurring monthly price on this product
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  let price = prices.data.find(
    (p) =>
      p.currency === "usd" &&
      p.unit_amount === plan.priceUsdCents &&
      p.recurring?.interval === "month"
  );

  if (price) {
    log.skip(`${plan.name}: Stripe price already exists (${price.id})`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceUsdCents,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { planCode: plan.planCode },
    });
    log.ok(`${plan.name}: Created Stripe price ${price.id} ($${plan.priceUsdCents / 100}/mo)`);
  }

  return price.id;
}

const PLAN_DEFS = [
  {
    planCode: "free",
    name: "Free",
    priceUsdCents: 0,
    duration: "monthly",
    features: {
      rbac: false,
      auditLogs: false,
      apiAccess: false,
      automationWorkers: false,
      advancedSecurity: false,
      sso: false,
    },
    limits: {
      maxUsers: 5,
      maxStorageGB: 1,
      maxApiCallsPerMonth: 0,
      auditLogRetentionDays: 0,
      maxAITokensPerMonth: 10000,
      maxAIReportsPerMonth: 5,
    },
    metadata: {
      tier: 1,
      price: 0,
      monthlyAmount: 0,
      yearlyPrice: 0,
      description: "Get started with the basics. No credit card required.",
      badge: null,
    },
  },
  {
    planCode: "pro",
    name: "Pro",
    priceUsdCents: 2900, // $29.00
    duration: "monthly",
    features: {
      rbac: true,
      auditLogs: true,
      apiAccess: true,
      automationWorkers: false,
      advancedSecurity: false,
      sso: false,
    },
    limits: {
      maxUsers: 50,
      maxStorageGB: 50,
      maxApiCallsPerMonth: 50000,
      auditLogRetentionDays: 90,
      maxAITokensPerMonth: 500000,
      maxAIReportsPerMonth: 100,
    },
    metadata: {
      tier: 2,
      price: 29,
      monthlyAmount: 29,
      yearlyPrice: 290,
      description: "For growing teams that need more power and visibility.",
      badge: "Most Popular",
    },
  },
  {
    planCode: "enterprise",
    name: "Enterprise",
    priceUsdCents: 9900, // $99.00
    duration: "monthly",
    features: {
      rbac: true,
      auditLogs: true,
      apiAccess: true,
      automationWorkers: true,
      advancedSecurity: true,
      sso: true,
    },
    limits: {
      maxUsers: 0,
      maxStorageGB: 0,
      maxApiCallsPerMonth: 0,
      auditLogRetentionDays: 365,
      maxAITokensPerMonth: 0,
      maxAIReportsPerMonth: 0,
    },
    metadata: {
      tier: 3,
      price: 99,
      monthlyAmount: 99,
      yearlyPrice: 990,
      description: "Unlimited scale with advanced security, SSO, and automation.",
      badge: "Enterprise",
    },
  },
];

async function resetPlans() {
  // Set up Stripe client if key is available
  let stripe = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey !== "sk_test_your_key_here") {
    stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    log.ok("Stripe client initialized — will create/retrieve real Price IDs");
  } else {
    log.warn("STRIPE_SECRET_KEY not set — using placeholder price IDs");
  }

  // Deactivate all existing plans
  const deactivated = await PlanCatalog.updateMany({}, { $set: { isActive: false } });
  log.info(`Deactivated ${deactivated.modifiedCount} existing plan(s)`);

  for (const plan of PLAN_DEFS) {
    // Get real Stripe price ID if Stripe is configured
    let stripePriceId = `price_${plan.planCode}_placeholder`;
    if (stripe) {
      try {
        stripePriceId = await getOrCreateStripePrice(stripe, plan);
      } catch (err) {
        log.warn(`Could not create Stripe price for ${plan.name}: ${err.message}`);
      }
    }

    const updateData = {
      name: plan.name,
      stripePriceId,
      duration: plan.duration,
      isActive: true,
      features: plan.features,
      limits: plan.limits,
      metadata: plan.metadata,
    };

    const existing = await PlanCatalog.findOne({ planCode: plan.planCode });
    if (existing) {
      await PlanCatalog.findByIdAndUpdate(existing._id, { $set: updateData });
      log.ok(`Updated plan: ${plan.name} (tier ${plan.metadata.tier}, $${plan.metadata.price}/mo) — priceId: ${stripePriceId}`);
    } else {
      await PlanCatalog.create({ planCode: plan.planCode, ...updateData });
      log.ok(`Created plan: ${plan.name} (tier ${plan.metadata.tier}, $${plan.metadata.price}/mo) — priceId: ${stripePriceId}`);
    }
  }

  // Summary
  const all = await PlanCatalog.find({}).lean();
  console.log("\n  Final plan summary:");
  for (const p of all) {
    const tier = p.metadata?.tier ?? "?";
    const price = p.metadata?.price ?? "?";
    const active = p.isActive ? "✅ active" : "❌ inactive";
    console.log(`    [${active}] ${p.name.padEnd(12)} tier=${tier}  $${price}/mo  priceId=${p.stripePriceId}`);
  }
}

async function main() {
  console.log("\n════════════════════════════════════════════════════");
  console.log("  Reset Billing Plans — DSR-V5");
  console.log("════════════════════════════════════════════════════");
  try {
    await connectDB();
    await resetPlans();
    log.ok("\nDone! Now restart the backend server.");
  } catch (err) {
    log.err("Script failed", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
