/**
 * WorkReport model. Manual employee report linked to one or more goals.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const schema = new mongoose.Schema(
  {
    employeeMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "TenantMembership", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplate", required: true },
    reportType: { type: String, enum: ["DSR", "WSR", "MSR", "QSR", "YSR"], required: true },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    contentTitle: { type: String, default: null, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000 },
    content: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    goalIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkGoal" }],
      default: [],
    },
    sourceReportIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkReport" }],
      default: [],
    },
    status: { type: String, enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"], default: "DRAFT" },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedByManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerComments: { type: String, default: null, maxlength: 5000 },
    comments: {
      type: [
        new mongoose.Schema(
          {
            authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            message: { type: String, required: true, trim: true, maxlength: 5000 },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: true, strict: true }
        ),
      ],
      default: [],
    },
    efficiencyScore: { type: Number, default: null, min: 0, max: 100 },
    qualityScore: { type: Number, default: null, min: 0, max: 100 },
    submissionDeadline: { type: Date, default: null },
    isLate: { type: Boolean, default: false },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 5000 },
    aiSuggestionSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    aiAnalysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, employeeMemberId: 1, reportType: 1, "period.startDate": -1 });
schema.index({ tenantId: 1, departmentId: 1, templateId: 1 });
schema.index({ tenantId: 1, status: 1, reportType: 1 });
schema.index({ tenantId: 1, goalIds: 1 });
schema.index({ tenantId: 1, submissionDeadline: 1, status: 1 });
schema.index({ tenantId: 1, isLate: 1, createdAt: -1 });

export default mongoose.model("WorkReport", schema);
