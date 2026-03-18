/**
 * IntegrationSyncState model. Cursor state per resource/branch.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const schema = new mongoose.Schema(
  {
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Integration", required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "IntegrationResource", required: true },
    branch: { type: String, default: null, trim: true },
    lastCommitSha: { type: String, default: null },
    lastCommitAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    status: { type: String, enum: ["ok", "error"], default: "ok" },
    error: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, integrationId: 1, resourceId: 1, branch: 1 }, { unique: true });

export default mongoose.model("IntegrationSyncState", schema);
