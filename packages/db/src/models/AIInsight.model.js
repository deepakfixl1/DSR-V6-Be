/**
 * AIInsight model. Stores long-term AI-generated insights.
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
    entityType: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    inputHash: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    createdByAI: {
      type: Boolean,
      default: true,
      index: true
    },
    humanOverride: {
      type: Boolean,
      default: false,
      index: true
    },
    title: {
      type: String,
      default: null
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    insight: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    explanation: {
      type: String,
      default: null
    },
    modelVersion: {
      type: String,
      default: "gpt-4o-mini-2024-07-18"
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
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

schema.index({ tenantId: 1, type: 1, createdAt: -1 });
schema.index({ tenantId: 1, userId: 1, createdAt: -1 });
schema.index({ tenantId: 1, entityType: 1, entityId: 1, type: 1, createdAt: -1 });
schema.index({ tenantId: 1, inputHash: 1, type: 1, createdAt: -1 });

export default mongoose.model("AIInsight", schema);
