/**
 * DeadlinePolicy model. Tenant-scoped rules that define submission deadlines
 * for report types. When lockAfterDeadline=true, employees cannot submit after
 * the deadline — they must request a manager extension.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { softDeletePlugin } from "../plugins/softDelete.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const deadlineConfigSchema = new mongoose.Schema(
  {
    // daily  → fire every day at hour:minute (e.g. DSR at 23:00)
    // weekly → fire on dayOfWeek at hour:minute (e.g. WSR on Monday 06:00)
    // monthly→ fire on dayOfMonth at hour:minute
    cadence: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    hour: { type: Number, required: true, min: 0, max: 23 },
    minute: { type: Number, required: true, min: 0, max: 59, default: 0 },
    timezone: { type: String, default: "Asia/Kolkata", trim: true },
    // For weekly cadence: 0=Sunday … 6=Saturday
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    // For monthly cadence: 1-31
    dayOfMonth: { type: Number, min: 1, max: 31, default: null },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    reportType: {
      type: String,
      enum: ["DSR", "WSR", "MSR", "QSR", "YSR"],
      required: true,
    },
    deadline: { type: deadlineConfigSchema, required: true },
    // When true, submitWorkReport() will reject submissions after the deadline
    lockAfterDeadline: { type: Boolean, default: true },
    // When true, employee sees a "Request Extension" button after deadline
    allowExtensionRequest: { type: Boolean, default: true },
    // Extra minutes after deadline before hard lock kicks in
    gracePeriodMinutes: { type: Number, default: 0, min: 0, max: 1440 },
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

export default mongoose.model("DeadlinePolicy", schema);
