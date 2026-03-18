import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const TenantMembershipSchema = new mongoose.Schema(
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
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
      default: null,
      index: true,
    },
    employeeId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["invited", "active", "disabled"],
      default: "active",
      index: true,
    },

    joinedAt: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    reportSubmissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isOwner: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
    optimisticConcurrency: true,
  }
);

TenantMembershipSchema.plugin(toJSONPlugin);
TenantMembershipSchema.plugin(tenantPlugin);

// Unique per tenant
TenantMembershipSchema.index(
  { tenantId: 1, userId: 1 },
  { unique: true }
);

// Fast queries
TenantMembershipSchema.index({ userId: 1 });
TenantMembershipSchema.index({ tenantId: 1, status: 1 });
TenantMembershipSchema.index({ tenantId: 1, departmentId: 1, status: 1 });
TenantMembershipSchema.index({ tenantId: 1, managerId: 1, status: 1 });

export default mongoose.model("TenantMembership", TenantMembershipSchema);
