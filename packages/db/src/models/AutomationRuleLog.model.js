/**
 * AutomationRuleLog model. Immutable execution history for automation rules.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const actionResultSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    error: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutomationRule",
      required: true,
      index: true,
    },
    ruleName: { type: String, default: "" },
    trigger: {
      event: { type: String, default: "" },
      payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    status: {
      type: String,
      enum: ["success", "partial", "failed"],
      required: true,
    },
    actionsExecuted: { type: [actionResultSchema], default: [] },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, ruleId: 1, createdAt: -1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("AutomationRuleLog", schema);
