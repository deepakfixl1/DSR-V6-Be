/**
 * TenantFeature model. Tracks which features are enabled per tenant for gating and licensing.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    featureKey: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, featureKey: 1 }, { unique: true });
schema.index({ tenantId: 1, enabled: 1 });

export default mongoose.model('TenantFeature', schema);
