/**
 * ReportVersion model. Versioned snapshot of a report (file ref, version number) for audit and comparison.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportSubmission', required: true },
    version: { type: Number, required: true },
    storageKey: { type: String, default: null },
    mimeType: { type: String, default: null },
    sizeBytes: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, submissionId: 1, version: 1 }, { unique: true });

export default mongoose.model('ReportVersion', schema);
