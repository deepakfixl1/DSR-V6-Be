/**
 * AIUsagePolicy model. Tenant-scoped AI usage limits applied at
 * tenant / department / user scope. Enforced by ai.guard.js.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { softDeletePlugin } from "../plugins/softDelete.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const limitsSchema = new mongoose.Schema(
  {
    // null means unlimited for that dimension
    tokensPerDay: { type: Number, default: null, min: 0 },
    requestsPerDay: { type: Number, default: null, min: 0 },
    tokensPerMonth: { type: Number, default: null, min: 0 },
    requestsPerMonth: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    // tenant  → applies to the whole tenant (scopeId is null)
    // department → applies to a specific department
    // user    → applies to a specific user
    scope: {
      type: String,
      enum: ["tenant", "department", "user"],
      required: true,
      default: "tenant",
    },
    // ObjectId of the department or user, null when scope=tenant
    scopeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    limits: { type: limitsSchema, required: true },
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

schema.index({ tenantId: 1, scope: 1, status: 1 });
schema.index({ tenantId: 1, scopeId: 1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("AIUsagePolicy", schema);
