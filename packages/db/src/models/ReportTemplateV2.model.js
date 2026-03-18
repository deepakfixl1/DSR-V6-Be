/**
 * ReportTemplateV2 model. Tenant-defined, versioned reporting templates.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";
import { paginatePlugin } from "../plugins/paginate.plugin.js";
import { auditChainPlugin } from "../plugins/auditChain.plugin.js";

const fieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    validation: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      regex: { type: String, default: null },
      maxLength: { type: Number, default: null },
    },
    AIEnabled: { type: Boolean, default: false },
    autoFillFrom: {
      type: String,
      enum: [ "goals", "previousReport", null],
      default: null,
    },
    scoringWeight: { type: Number, default: null },
    conditionalLogic: {
      dependsOnField: { type: String, default: null },
      condition: { type: String, default: null },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  { _id: false, strict: true, minimize: false }
);

const sectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 2000 },
    order: { type: Number, default: 0 },
    fields: { type: [fieldSchema], default: [] },
  },
  { _id: false, strict: true, minimize: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"],
      required: true,
    },
    reportType: {
      type: String,
      enum: ["DSR", "WSR", "MSR", "QSR", "YSR", "CUSTOM"],
      default: "DSR",
    },
    targetAudience: {
      type: String,
      enum: ["individual", "team", "department", "company"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isSystemTemplate: { type: Boolean, default: false },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    version: { type: Number, required: true },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplateV2", default: null },
    scheduleConfig: {
      required: { type: Boolean, default: false },
      dueTime: { type: String, default: null },
      autoReminder: { type: Boolean, default: false },
      gracePeriodHours: { type: Number, default: 0 },
    },
    scoringConfig: {
      enabled: { type: Boolean, default: false },
      maxScore: { type: Number, default: 100 },
      calculationLogic: { type: String, default: null },
    },
    sections: { type: [sectionSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, code: 1, version: 1 }, { unique: true });
schema.index({ tenantId: 1, status: 1, isDefault: 1 });

export default mongoose.model("ReportTemplateV2", schema);
