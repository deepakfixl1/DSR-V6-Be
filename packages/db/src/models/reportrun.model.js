// apps/api/src/models/ReportRun.js
import mongoose from "mongoose";

const ReportRunSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, required: true },
    templateId: { type: mongoose.Types.ObjectId, required: true, index: true },
    scheduleId: { type: mongoose.Types.ObjectId, index: true }, // null if manual run

    // What period this report covers
    period: {
      from: { type: Date, required: true, index: true },
      to: { type: Date, required: true, index: true },
      label: { type: String }, // "Week 07 2026", "Q1 2026"
    },

    // Snapshot of scope used (important for audits)
    scopeSnapshot: {
      type: {
        type: String,
        enum: ["TENANT", "DEPARTMENT", "TEAM", "USER", "CUSTOM"],
        required: true,
      },
      departmentId: { type: mongoose.Types.ObjectId },
      teamId: { type: mongoose.Types.ObjectId },
      userId: { type: mongoose.Types.ObjectId },
      customFilters: { type: Object, default: {} },
    },

    // Output
    outputs: [
      {
        format: { type: String, enum: ["PDF", "XLSX", "CSV", "JSON", "HTML"], required: true },
        file: {
          storage: { type: String, enum: ["S3", "LOCAL", "GRIDFS"], required: true },
          path: { type: String, required: true }, // or url if you want
          sizeBytes: { type: Number },
          checksum: { type: String },
        },
      },
    ],

    // Optional structured data snapshot (for dashboard / drilldown)
    // Keep size controlled: store derived aggregates not raw data.
    dataSummary: { type: Object, default: {} },

    // Status tracking
    status: { type: String, enum: ["queued", "running", "success", "failed"], default: "queued", index: true },
    error: {
      message: { type: String },
      stack: { type: String },
      code: { type: String },
    },

    // Job link (BullMQ)
    job: {
      queue: { type: String, default: "reports" },
      jobId: { type: String, index: true },
      attempts: { type: Number, default: 0 },
      startedAt: { type: Date },
      finishedAt: { type: Date },
      durationMs: { type: Number },
    },

    // Initiator
    triggeredBy: { type: mongoose.Types.ObjectId }, // userId
    triggerType: { type: String, enum: ["manual", "schedule", "api"], default: "schedule" },
  },
  { timestamps: true }
);

ReportRunSchema.index({ tenantId: 1, templateId: 1, "period.from": 1, "period.to": 1 });
ReportRunSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.model("ReportRun", ReportRunSchema);