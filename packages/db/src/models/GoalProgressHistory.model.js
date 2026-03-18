/**
 * GoalProgressHistory model. Manager-only audit history for goal progress/status updates.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const schema = new mongoose.Schema(
  {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkGoal", required: true },
    sourceReportId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkReport", default: null },
    previousPct: { type: Number, required: true, min: 0, max: 100 },
    newPct: { type: Number, required: true, min: 0, max: 100 },
    previousStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "UNDER_REVIEW", "COMPLETED", "CARRIED_FORWARD"],
      required: true,
    },
    newStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "UNDER_REVIEW", "COMPLETED", "CARRIED_FORWARD"],
      required: true,
    },
    reason: { type: String, default: null, maxlength: 2000 },
    updatedByManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, goalId: 1, updatedAt: -1 });
schema.index({ tenantId: 1, sourceReportId: 1, updatedAt: -1 });

export default mongoose.model("GoalProgressHistory", schema);
