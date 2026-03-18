/**
 * ReportInstance model. Stores submissions tied to template versions.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplateV2", required: true },
    templateVersion: { type: Number, required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    calculatedScore: { type: Number, default: null },
    AIAnalysis: {
      summary: { type: String, default: null },
      sentiment: { type: String, default: null },
      productivityScore: { type: Number, default: null },
      blockerDetected: { type: Boolean, default: null },
      riskFlag: { type: Boolean, default: null },
    },
    approvalFlow: {
      required: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      comments: { type: String, default: null },
    },
    submittedAt: { type: Date, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, templateId: 1, templateVersion: 1 });
schema.index({ tenantId: 1, submittedBy: 1, "period.startDate": 1 });

export default mongoose.model("ReportInstance", schema);
