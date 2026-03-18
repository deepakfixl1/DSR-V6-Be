/**
 * WebhookLog model. Logs incoming webhook requests for debugging and idempotency.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', default: null },
    event: { type: String, required: true, trim: true },
    sourceId: { type: String, default: null },
    statusCode: { type: Number, default: null },
    requestPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    responsePayload: { type: mongoose.Schema.Types.Mixed, default: null },
    processedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, createdAt: -1 });
schema.index({ tenantId: 1, event: 1, sourceId: 1 });

export default mongoose.model('WebhookLog', schema);
