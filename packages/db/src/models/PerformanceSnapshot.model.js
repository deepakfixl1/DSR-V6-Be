/**
 * PerformanceSnapshot model. Time-series metrics (response times, throughput) for dashboards and alerts.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    metric: { type: String, required: true, trim: true },
    value: { type: Number, required: true },
    unit: { type: String, default: null },
    dimensions: { type: mongoose.Schema.Types.Mixed, default: {} },
    capturedAt: { type: Date, default: Date.now },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, name: 1, capturedAt: -1 });
schema.index({ tenantId: 1, metric: 1, capturedAt: -1 });

export default mongoose.model('PerformanceSnapshot', schema);
