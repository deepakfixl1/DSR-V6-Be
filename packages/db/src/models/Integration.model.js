/**
 * Integration model. Registered third-party integrations (Jira, GitHub, etc.) per tenant.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSyncAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, type: 1 });
schema.index({ tenantId: 1, status: 1 });

export default mongoose.model('Integration', schema);
