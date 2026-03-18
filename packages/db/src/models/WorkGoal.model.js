/**
 * WorkGoal model.
 * Goal-oriented weekly execution unit with parent-child linkage,
 * reporting support, progress tracking, blockers, and approval state.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { softDeletePlugin } from "../plugins/softDelete.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const timelineSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    dueDayOfWeek: { type: Number, required: true, min: 1, max: 7 },
  },
  { _id: false, strict: true, minimize: false }
);

const aiSchema = new mongoose.Schema(
  {
    estimatedProgressPct: { type: Number, default: null, min: 0, max: 100 },
    pendingWorkSummary: { type: String, default: null, maxlength: 5000 },
    lastAnalyzedAt: { type: Date, default: null },
  },
  { _id: false, strict: true, minimize: false }
);

const progressSchema = new mongoose.Schema(
  {
    selfReportedPct: { type: Number, default: 0, min: 0, max: 100 },
    managerApprovedPct: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdatedAt: { type: Date, default: null },
  },
  { _id: false, strict: true, minimize: false }
);

const approvalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"],
      default: "PENDING",
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 5000 },
  },
  { _id: false, strict: true, minimize: false }
);

const blockerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000 },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false, strict: true, minimize: false }
);

const reportingSchema = new mongoose.Schema(
  {
    includeInDSR: { type: Boolean, default: true },
    includeInWSR: { type: Boolean, default: true },
    includeInMSR: { type: Boolean, default: true },
  },
  { _id: false, strict: true, minimize: false }
);

const schema = new mongoose.Schema(
  {
    goalCode: { type: String, default: null, trim: true, index: true },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    weekCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WeekCycle",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000 },

    goalType: {
      type: String,
      enum: ["parent", "child", "direct"],
      default: "direct",
      index: true,
    },

    category: {
      type: String,
      enum: ["DELIVERY", "SALES", "SUPPORT", "LEARNING", "OPERATIONS", "QUALITY", "CUSTOM","DEVELOPMENT"],
      default: "CUSTOM",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    assignedToMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parentGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkGoal",
      default: null,
      index: true,
    },

    dependsOnGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkGoal" }],

    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "UNDER_REVIEW", "COMPLETED", "CARRIED_FORWARD"],
      default: "NOT_STARTED",
      index: true,
    },

    progress: { type: progressSchema, default: {} },

    timeline: { type: timelineSchema, required: true },

    targetDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    weight: { type: Number, default: 1, min: 0 },
    estimatedHours: { type: Number, default: 0, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },

    blockers: { type: [blockerSchema], default: [] },

    remarks: { type: String, default: null, maxlength: 5000 },
    managerRemarks: { type: String, default: null, maxlength: 5000 },

    visibility: {
      type: String,
      enum: ["PRIVATE", "TEAM", "DEPARTMENT", "MANAGEMENT"],
      default: "TEAM",
    },

    approval: { type: approvalSchema, default: {} },

    createdByManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedByManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkGoal",
      default: null,
      index: true,
    },

    isCarriedForward: { type: Boolean, default: false },

    reporting: { type: reportingSchema, default: {} },

    ai: { type: aiSchema, default: {} },

    tags: [{ type: String, trim: true }],
    linkedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkGoal" }],
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
schema.plugin(softDeletePlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, assignedToMemberId: 1, weekCycleId: 1 });
schema.index({ tenantId: 1, departmentId: 1, weekCycleId: 1 });
schema.index({ tenantId: 1, parentGoalId: 1 });
schema.index({ tenantId: 1, status: 1, "timeline.dueDate": 1 });
schema.index({ tenantId: 1, originGoalId: 1 });
schema.index({ tenantId: 1, weekCycleId: 1, assignedToMemberId: 1, status: 1 });
schema.index({ tenantId: 1, departmentId: 1, status: 1, priority: 1 });
schema.index({ tenantId: 1, category: 1, status: 1 });
schema.index({ tenantId: 1, goalCode: 1 }, { sparse: true });
schema.index({ tenantId: 1, visibility: 1, departmentId: 1 });

schema.pre("validate", function (next) {
  if (this.timeline?.startDate && this.timeline?.dueDate && this.timeline.startDate > this.timeline.dueDate) {
    return next(new Error("timeline.startDate cannot be greater than timeline.dueDate"));
  }

  if (this.targetDate && this.timeline?.startDate && this.targetDate < this.timeline.startDate) {
    return next(new Error("targetDate cannot be before timeline.startDate"));
  }

  if (this.goalType === "child" && !this.parentGoalId) {
    return next(new Error("parentGoalId is required when goalType is child"));
  }

  if (["parent", "direct"].includes(this.goalType) && this.parentGoalId) {
    return next(new Error("parentGoalId must be null when goalType is parent or direct"));
  }

  if (this.isCarriedForward && !this.originGoalId) {
    return next(new Error("originGoalId is required when isCarriedForward is true"));
  }

  if (this.status === "COMPLETED") {
    if (!this.completedAt) this.completedAt = new Date();
    this.progress.selfReportedPct = 100;
    if (this.progress.managerApprovedPct < 100) {
      this.progress.managerApprovedPct = 100;
    }
  }

  // Only require blockers when status is being set to BLOCKED (not when only approval/other fields change)
  if (this.isModified("status") && this.status === "BLOCKED" && !this.blockers?.length) {
    return next(new Error("At least one blocker is required when status is BLOCKED"));
  }

  this.progress.lastUpdatedAt = new Date();

  next();
});

export default mongoose.model("WorkGoal", schema);
