/**
 * Goal (OKR) model. Supports hierarchical goals with weighted key results.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const keyResultSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    metricType: {
      type: String,
      enum: ["percentage", "number", "currency", "boolean"],
      required: true,
    },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    weight: { type: Number, default: 1 },
    autoUpdateFrom: { type: String, enum: ["tasks", "reports", "manual"], default: "manual" },
    linkedMetricKey: { type: String, default: null },
  },
  { _id: false, strict: true, minimize: false }
);

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["company", "department", "team", "individual"],
      required: true,
    },
    parentGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000 },
    tags: [{ type: String, trim: true }],
    visibility: {
      type: String,
      enum: ["PRIVATE", "TEAM", "DEPARTMENT", "MANAGEMENT"],
      default: "TEAM",
    },
    linkedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    period: {
      type: {
        type: String,
        enum: ["yearly", "quarterly", "monthly"],
        required: true,
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    keyResults: { type: [keyResultSchema], default: [] },
    weightage: { type: Number, default: 1 },
    progress: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["not_started", "on_track", "at_risk", "off_track", "completed"],
      default: "not_started",
    },
    AIInsights: {
      riskScore: { type: Number, default: null },
      prediction: { type: String, default: null },
      trend: { type: String, default: null },
    },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, type: 1 });
schema.index({ tenantId: 1, ownerId: 1 });
schema.index({ tenantId: 1, parentGoalId: 1 });
schema.index({ tenantId: 1, visibility: 1, departmentId: 1 });

export default mongoose.model("Goal", schema);
