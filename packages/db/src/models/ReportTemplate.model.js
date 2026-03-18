import mongoose from "mongoose";

// apps/api/src/models/ReportTemplate.js


const ReportTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, required: true },

    // Identity
    code: { type: String, required: true }, // e.g. "DSR_STANDARD", "WSR_EXEC", "QTR_FINANCE"
    name: { type: String, required: true }, // e.g. "Daily Status Report"
    description: { type: String },

    // Type & scope
    reportType: {
      type: String,
      required: true,
      enum: ["DSR", "WSR", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
      index: true,
    },

    // Supports all departments: can be ALL or a list
    departmentScope: {
      type: String,
      enum: ["ALL", "SELECTED"],
      default: "ALL",
    },
    departmentIds: [{ type: mongoose.Types.ObjectId }], // used if SELECTED

    // Optional: further scoping (if needed)
    teamIds: [{ type: mongoose.Types.ObjectId }],
    userIds: [{ type: mongoose.Types.ObjectId }],

    // Data definition (flexible)
    // Each block defines what data to query and how to present it
    sections: [
      {
        key: { type: String, required: true }, // "summary", "tasks", "risks"
        title: { type: String, required: true },
        enabled: { type: Boolean, default: true },

        // Data source config (kept generic so you can add modules easily)
        // Example: module=tasks, collection=Task, filters, groupBy, metrics
        source: {
          module: { type: String, required: true }, // "tasks", "audit", "integrations"
          entity: { type: String, required: true }, // "Task", "AuditLog"
          baseFilters: { type: Object, default: {} }, // Mongo filter object
          groupBy: { type: Object }, // grouping rules
          metrics: [{ type: Object }], // aggregation metrics
          sort: { type: Object },
          limit: { type: Number },
        },

        // Presentation rules (for PDF/HTML/table)
        view: {
          type: {
            type: String,
            enum: ["TABLE", "CHART", "TEXT", "KPI", "LIST"],
            default: "TABLE",
          },
          columns: [{ type: Object }], // { key, label, format }
          chart: { type: Object }, // chart config
          template: { type: String }, // optional html/handlebars template key
        },
      },
    ],

    // Output and delivery defaults
    outputDefaults: {
      formats: {
        type: [String],
        default: ["PDF"],
        enum: ["PDF", "XLSX", "CSV", "JSON", "HTML"],
      },
      timezone: { type: String, default: "Asia/Kolkata" },
      locale: { type: String, default: "en-IN" },
      currency: { type: String, default: "INR" },
      includeBranding: { type: Boolean, default: true },
    },

    // Access control (permission tags)
    access: {
      minPermission: { type: String, default: "reports.view" }, // RBAC permission string
      allowedRoleIds: [{ type: mongoose.Types.ObjectId }], // optional allowlist
      allowedUserIds: [{ type: mongoose.Types.ObjectId }],
    },

    // Status
    status: { type: String, enum: ["active", "disabled"], default: "active", index: true },

    // Audit fields
    createdBy: { type: mongoose.Types.ObjectId, required: true },
    updatedBy: { type: mongoose.Types.ObjectId },
  },
  { timestamps: true }
);

// Unique per tenant
ReportTemplateSchema.index({ tenantId: 1, code: 1 }, { unique: true });
ReportTemplateSchema.index({ tenantId: 1, reportType: 1, status: 1 });

export default mongoose.model("ReportTemplate", ReportTemplateSchema);