/**
 * TenantUsage model
 * Monthly usage counters per tenant.
 * Used for plan limit enforcement, analytics, and billing.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";

const schema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    /**
     * Month identifier
     * Format: YYYYMM
     */
    monthKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{6}$/,
      index: true,
    },

    /**
     * USER METRICS
     */
    activeUsers: {
      type: Number,
      default: 0,
      min: 0,
    },

    invitedUsers: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * API USAGE
     */
    apiCalls: {
      type: Number,
      default: 0,
      min: 0,
    },

   
    storageBytes: {
      type: Number,
      default: 0,
      min: 0,
    },

    storageFiles: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * AI USAGE
     */
    aiTokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    aiReportsGenerated: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * AUTOMATION
     */
    automationRuns: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * RESOURCE COUNTERS
     * Used for enforcing limits like maxProjects
     */
    projectsCreated: {
      type: Number,
      default: 0,
      min: 0,
    },

    boardsCreated: {
      type: Number,
      default: 0,
      min: 0,
    },

    todosCreated: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Flexible data storage for future metrics
     */
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

/**
 * One usage document per tenant per month
 */
schema.index(
  { tenantId: 1, monthKey: 1 },
  { unique: true }
);

/**
 * Query optimization
 */
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("TenantUsage", schema);