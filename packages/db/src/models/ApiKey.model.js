/**
 * ApiKey model. API keys for server-to-server or programmatic access; key hash stored, prefix for identification.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true },
    scopes: [{ type: String, trim: true }],
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, keyPrefix: 1 });
schema.index({ tenantId: 1, userId: 1 });
schema.index({ expiresAt: 1 });

export default mongoose.model('ApiKey', schema);
