/**
 * WeekCycle model.
 * Tracks an employee's weekly planning/review cycle and weekly summary state.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const summarySchema = new mongoose.Schema(
  {
    totalGoals: { type: Number, default: 0, min: 0 },
    completedGoals: { type: Number, default: 0, min: 0 },
    blockedGoals: { type: Number, default: 0, min: 0 },
    carriedForwardGoals: { type: Number, default: 0, min: 0 },
    completionPct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false, strict: true, minimize: false }
);

const schema = new mongoose.Schema(
  {
    employeeMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
      required: true,
      index: true,
    },

    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },

    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6], // 1=Mon ... 7=Sun
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((v) => Number.isInteger(v) && v >= 1 && v <= 7),
        message: "workingDays must contain integers between 1 and 7",
      },
    },

    goalSlotCount: { type: Number, default: 6, min: 1, max: 7 },
    carriedForwardGoalCount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["OPEN", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"],
      default: "OPEN",
      index: true,
    },

    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    employeeRemarks: { type: String, default: null, maxlength: 5000 },
    managerRemarks: { type: String, default: null, maxlength: 5000 },

    summary: { type: summarySchema, default: {} },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    strict: true,
    minimize: false,
    timestamps: true,
    optimisticConcurrency: true,
  }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, employeeMemberId: 1, weekStartDate: 1 }, { unique: true });
schema.index({ tenantId: 1, weekStartDate: 1 });
schema.index({ tenantId: 1, employeeMemberId: 1, status: 1 });
schema.index({ tenantId: 1, approvalStatus: 1, status: 1 });

schema.pre("validate", function (next) {
  if (this.weekStartDate && this.weekEndDate && this.weekStartDate > this.weekEndDate) {
    return next(new Error("weekStartDate cannot be greater than weekEndDate"));
  }

  if (this.status === "SUBMITTED" && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (this.status === "APPROVED") {
    this.approvalStatus = "APPROVED";
    if (!this.reviewedAt) this.reviewedAt = new Date();
  }

  next();
});

export default mongoose.model("WeekCycle", schema);