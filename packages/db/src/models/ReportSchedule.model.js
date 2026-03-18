// apps/api/src/models/ReportSchedule.js
import mongoose from "mongoose";

const ReportScheduleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, required: true },
    templateId: { type: mongoose.Types.ObjectId, required: true, index: true },

    name: { type: String, required: true }, // "DSR - Engineering Daily"
    status: { type: String, enum: ["active", "paused", "disabled"], default: "active", index: true },

    // Generate for which scope (supports all departments)
    scope: {
      type: {
        type: String,
        enum: ["TENANT", "DEPARTMENT", "TEAM", "USER", "CUSTOM"],
        default: "TENANT",
        index: true,
      },
      departmentId: { type: mongoose.Types.ObjectId },
      teamId: { type: mongoose.Types.ObjectId },
      userId: { type: mongoose.Types.ObjectId },
      customFilters: { type: Object, default: {} }, // extra filters (e.g. projectId)
    },

    // Schedule rules
    cadence: {
      type: String,
      required: true,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CRON"],
      index: true,
    },
    cronExpr: { type: String }, // if cadence=CRON

    timezone: { type: String, default: "Asia/Kolkata" },
    runAt: {
      hour: { type: Number, default: 9 }, // 9 AM default
      minute: { type: Number, default: 0 },
    },
    weekday: { type: Number }, // 0-6 if WEEKLY
    dayOfMonth: { type: Number }, // 1-31 if MONTHLY
    monthOfYear: { type: Number }, // 1-12 if YEARLY
    quarter: { type: Number }, // 1-4 if QUARTERLY

    // Delivery
    delivery: {
      channels: { type: [String], default: ["IN_APP"], enum: ["IN_APP", "EMAIL", "SLACK", "WEBHOOK"] },
      recipients: {
        userIds: [{ type: mongoose.Types.ObjectId }],
        emails: [{ type: String }],
        slackChannelIds: [{ type: String }],
        webhookUrls: [{ type: String }],
      },
      subjectTemplate: { type: String }, // "WSR - {{department}} - Week {{week}}"
      messageTemplate: { type: String },
    },

    // Output override
    output: {
      formats: { type: [String], default: ["PDF"], enum: ["PDF", "XLSX", "CSV", "JSON", "HTML"] },
      includeBranding: { type: Boolean, default: true },
    },

    // Tracking
    lastRunAt: { type: Date },
    nextRunAt: { type: Date, index: true },
    lastRunStatus: { type: String, enum: ["success", "failed", "partial"] },

    createdBy: { type: mongoose.Types.ObjectId, required: true },
    updatedBy: { type: mongoose.Types.ObjectId },
  },
  { timestamps: true }
);

ReportScheduleSchema.index({ tenantId: 1, templateId: 1, status: 1 });
ReportScheduleSchema.index({ tenantId: 1, nextRunAt: 1, status: 1 });

export default mongoose.model("ReportSchedule", ReportScheduleSchema);