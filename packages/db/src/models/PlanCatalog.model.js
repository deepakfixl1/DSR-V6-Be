/**
 * PlanCatalog model.
 * Global catalog of available subscription plans.
 * Immutable in production (only platform admin can modify).
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    stripePriceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    duration: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly"],
      default: "yearly",
      trim: true,
    },

    features: {
      rbac: { type: Boolean, default: true },
      auditLogs: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: true },
      automationWorkers: { type: Boolean, default: false },
      advancedSecurity: { type: Boolean, default: false },
      sso: { type: Boolean, default: false },
    },

    limits: {
      maxUsers: { type: Number, default: 3 },
      maxStorageGB: { type: Number, default: 1 },
      maxApiCallsPerMonth: { type: Number, default: 5000 },
      auditLogRetentionDays: { type: Number, default: 7 },
      maxAITokensPerMonth: { type: Number, default: 10000 },
      maxAIReportsPerMonth: { type: Number, default: 30 },
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
schema.plugin(auditChainPlugin);

schema.index({ isActive: 1 });

export default mongoose.model("PlanCatalog", schema);
