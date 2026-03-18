/**
 * ReportPenaltyLog model.
 * Records every penalty applied (or waived) for a missed report submission.
 * Created automatically when deadline passes or manually by admin.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
    },
    workReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkReport",
      default: null,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportPenaltyPolicy",
      default: null,
    },
    reportType: {
      type: String,
      enum: ["DSR", "WSR", "MSR", "QSR", "YSR"],
      required: true,
    },
    penaltyType: {
      type: String,
      enum: ["warning", "salary_deduction", "custom"],
      required: true,
    },
    // 0.25 = 1/4 day, 0.5 = half day, 1 = full day (for salary_deduction type)
    deductionFraction: { type: Number, default: null, min: 0, max: 1 },
    description: { type: String, trim: true, maxlength: 1000 },
    // The date the report was due
    missedDeadline: { type: Date, required: true },
    // Period the report was supposed to cover
    period: {
      startDate: { type: Date },
      endDate: { type: Date },
      label: { type: String },
    },

    // ── Status lifecycle ──────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "applied", "waived"],
      default: "pending",
    },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    appliedAt: { type: Date, default: null },
    waiveReason: { type: String, trim: true, maxlength: 1000 },
    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    waivedAt: { type: Date, default: null },

    // true = applied automatically by scheduler; false = manually by admin
    autoApplied: { type: Boolean, default: false },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, employeeId: 1, status: 1 });
schema.index({ tenantId: 1, reportType: 1, status: 1 });
schema.index({ tenantId: 1, missedDeadline: -1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("ReportPenaltyLog", schema);
