/**
 * LateSubmissionRequest model.
 * Represents an employee's request to submit a work report after the deadline.
 * Manager approves or rejects; on approval an extended deadline is set on the WorkReport.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    workReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkReport",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TenantMembership",
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    reportType: {
      type: String,
      enum: ["DSR", "WSR", "MSR", "QSR", "YSR"],
      required: true,
    },
    // Employee's reason for the late request
    reason: { type: String, required: true, trim: true, maxlength: 2000 },

    // ── Manager response ──────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    respondedAt: { type: Date, default: null },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerNotes: { type: String, trim: true, maxlength: 1000 },

    // New deadline granted by manager on approval (employee can submit until this time)
    extendedDeadline: { type: Date, default: null },

    // Whether the employee eventually submitted (after approval)
    submittedAfterExtension: { type: Boolean, default: false },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, requestedBy: 1, status: 1 });
schema.index({ tenantId: 1, managerId: 1, status: 1 });
schema.index({ tenantId: 1, workReportId: 1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("LateSubmissionRequest", schema);
