/**
 * Blocker model. Tracks impediments with escalation and SLA metadata.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    type: {
      type: String,
      enum: ["technical", "dependency", "approval", "external", "other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "escalated", "resolved", "closed"],
      default: "open",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000 },
    relatedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    relatedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    relatedReportId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportInstance", default: null },
    linkedBlockerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blocker" }],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    escalation: {
      level: { type: Number, default: 0 },
      escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      escalatedAt: { type: Date, default: null },
    },
    SLA: {
      expectedResolutionHours: { type: Number, default: null },
      dueAt: { type: Date, default: null, index: true },
      breached: { type: Boolean, default: false },
    },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null, maxlength: 5000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, status: 1 });
schema.index({ tenantId: 1, assigneeId: 1 });
schema.index({ tenantId: 1, severity: 1 });
schema.index({ tenantId: 1, priority: 1, status: 1 });
schema.index({ tenantId: 1, "SLA.dueAt": 1, "SLA.breached": 1 });

export default mongoose.model("Blocker", schema);
