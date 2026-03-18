/**
 * IntegrationResource model. Provider resources (e.g., GitHub repo) linked to an integration.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";
import { tenantPlugin } from "../plugins/tenant.plugin.js";

const schema = new mongoose.Schema(
  {
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Integration", required: true },
    provider: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    externalId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, default: null, trim: true },
    isEnabled: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index(
  { tenantId: 1, integrationId: 1, provider: 1, resourceType: 1, externalId: 1 },
  { unique: true }
);
schema.index({ tenantId: 1, provider: 1, resourceType: 1, isEnabled: 1 });

export default mongoose.model("IntegrationResource", schema);
