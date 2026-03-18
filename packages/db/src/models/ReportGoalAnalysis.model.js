/**
 * ReportGoalAnalysis model. AI analysis artifacts that compare report content against goals.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const schema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkReport", required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkGoal", required: true },
    matchScore: { type: Number, required: true, min: 0, max: 1 },
    aiEstimatedCompletionPct: { type: Number, default: null, min: 0, max: 100 },
    pendingWork: { type: [String], default: [] },
    missingExpectedUpdates: { type: [String], default: [] },
    recommendedAdditionalWork: { type: [String], default: [] },
    generatedAt: { type: Date, default: Date.now },
    modelMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, reportId: 1, goalId: 1 }, { unique: true });
schema.index({ tenantId: 1, goalId: 1, generatedAt: -1 });

export default mongoose.model("ReportGoalAnalysis", schema);
