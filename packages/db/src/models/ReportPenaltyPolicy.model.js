/**
 * ReportPenaltyPolicy model.
 * Defines per-report-type penalty rules and reminder configuration for a tenant.
 * Supports salary deductions, warnings, and custom penalties for missed reports.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { softDeletePlugin } from "../plugins/softDelete.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const reminderSchema = new mongoose.Schema(
  {
    minutesBefore: { type: Number, required: true, min: 1, max: 10080 }, // up to 7 days
    channels: [{ type: String, enum: ["IN_APP", "EMAIL"], default: ["IN_APP", "EMAIL"] }],
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    reportType: {
      type: String,
      enum: ["DSR", "WSR", "MSR", "QSR", "YSR"],
      required: true,
    },

    // ── Reminders ─────────────────────────────────────────────
    // e.g. [{ minutesBefore: 60, channels: ["IN_APP","EMAIL"] }, { minutesBefore: 15, ... }]
    reminders: { type: [reminderSchema], default: [] },

    // ── Penalty configuration ──────────────────────────────────
    penaltyType: {
      type: String,
      enum: ["none", "warning", "salary_deduction", "custom"],
      default: "warning",
    },
    // fraction of daily salary deducted (0.25 = 1/4 day, 0.5 = half day, 1 = full day)
    deductionFraction: { type: Number, default: 0.25, min: 0, max: 1 },
    // Human-readable label for custom penalties
    customPenaltyDescription: { type: String, trim: true, maxlength: 500 },

    // ── Behaviour ────────────────────────────────────────────────
    // Extra minutes after deadline before penalty is recorded (grace period)
    gracePeriodMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    // When true, penalty is recorded automatically by the scheduler
    autoApplyPenalty: { type: Boolean, default: false },
    // Allow employees to request late submission after deadline
    allowLateSubmissionRequest: { type: Boolean, default: true },
    // Require manager approval to submit after deadline (only if allowLateSubmissionRequest=true)
    requireManagerApproval: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(softDeletePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, reportType: 1, status: 1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("ReportPenaltyPolicy", schema);
