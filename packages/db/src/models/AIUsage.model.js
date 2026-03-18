/**
 * AIUsage model. Monthly token accounting used for AI governance.
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    feature: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    date: {
      type: Date,
      default: null,
      index: true
    },
    monthKey: {
      type: String,
      required: true,
      match: /^\d{6}$/,
      index: true
    },
    requestCount: {
      type: Number,
      default: 0,
      min: 0
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    strict: true,
    minimize: false,
    timestamps: true,
    optimisticConcurrency: true
  }
);

schema.plugin(toJSONPlugin);

schema.index({ tenantId: 1, monthKey: 1 }, { unique: true });
schema.index({ tenantId: 1, userId: 1, monthKey: 1 });
schema.index({ tenantId: 1, feature: 1, date: 1 });

export default mongoose.model("AIUsage", schema);
