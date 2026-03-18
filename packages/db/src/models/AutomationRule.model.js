/**
 * AutomationRule model. Tenant-scoped automation rules with triggers, conditions, and actions.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { softDeletePlugin } from "../plugins/softDelete.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    operator: {
      type: String,
      enum: ["eq", "neq", "in", "contains", "gt", "lt", "exists"],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["send_email", "send_notification", "create_audit_entry", "webhook"],
      required: true,
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    status: {
      type: String,
      enum: ["active", "paused", "draft"],
      default: "draft",
    },
    trigger: {
      event: { type: String, required: true, trim: true },
    },
    conditions: { type: [conditionSchema], default: [] },
    actions: { type: [actionSchema], default: [] },
    lastRunAt: { type: Date, default: null },
    runCount: { type: Number, default: 0 },
    lastRunStatus: {
      type: String,
      enum: ["success", "partial", "failed", null],
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(softDeletePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, status: 1 });
schema.index({ tenantId: 1, "trigger.event": 1, status: 1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("AutomationRule", schema);
