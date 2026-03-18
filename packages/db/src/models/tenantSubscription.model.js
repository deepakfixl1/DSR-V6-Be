/**
 * Subscription model.
 * Tracks Stripe subscription state per tenant.
 * One active subscription per tenant.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    stripeSubscriptionId: {
      type: String,
      required: false,
      default: undefined,  // undefined so sparse unique index skips missing values
      trim: true,
      sparse: true,
      unique: true,
    },

    stripeCustomerId: {
      type: String,
      required: false,
      default: null,
      trim: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanCatalog",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
      ],
      required: true,
      index: true,
    },

    currentPeriodStart: {
      type: Date,
      required: true,
      index: true,
    },

    currentPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    strict: true,
    minimize: false,
    timestamps: true,
    optimisticConcurrency: true,
  }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

// One subscription per tenant
schema.index({ tenantId: 1 }, { unique: true });

export default mongoose.model("Subscription", schema);
