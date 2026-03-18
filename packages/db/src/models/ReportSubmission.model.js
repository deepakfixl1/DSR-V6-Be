/**
 * ReportSubmission model. A single submission/run of a report (template + snapshot of data).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportTemplate', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, templateId: 1, createdAt: -1 });
schema.index({ tenantId: 1, submittedBy: 1, createdAt: -1 });
schema.index({ tenantId: 1, status: 1 });

export default mongoose.model('ReportSubmission', schema);
