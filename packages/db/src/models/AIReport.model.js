/**
 * AIReport model. Stores generated AI reports with caching and export metadata.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const schema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      enum: ["DSR", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"],
      index: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    generatedByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },
    narrative: {
      type: String,
      default: null
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    risks: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    recommendations: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    forecast: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    trends: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    costEstimate: {
      type: Number,
      default: 0,
      min: 0
    },
    modelVersion: {
      type: String,
      default: "gpt-4o-mini-2024-07-18"
    },
    dataScope: {
      tasksAnalyzed: { type: Number, default: 0 },
      usersAnalyzed: { type: Number, default: 0 },
      projectsAnalyzed: { type: Number, default: 0 },
      eventsAnalyzed: { type: Number, default: 0 }
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    explainability: {
      reasoning: { type: String, default: null },
      keySignals: { type: [String], default: [] },
      dataQuality: { type: String, enum: ["high", "medium", "low"], default: "medium" }
    },
    exports: {
      type: [
        {
          format: { type: String, enum: ["PDF", "CSV", "JSON"] },
          fileUrl: { type: String },
          generatedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    jobId: {
      type: String,
      default: null,
    },
    aiInsightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIInsight",
      default: null,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
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
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, reportType: 1, createdAt: -1 });
schema.index({ tenantId: 1, status: 1 });
schema.index({ tenantId: 1, "period.start": 1, "period.end": 1 });
schema.index({ jobId: 1 });

export default mongoose.model("AIReport", schema);
