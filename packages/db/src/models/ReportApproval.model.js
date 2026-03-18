/**
 * ReportApproval model. Approval workflow state for reports (approver, status, comment).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportSubmission', required: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportVersion', default: null },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: { type: String, default: null },
    decidedAt: { type: Date, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, submissionId: 1 });
schema.index({ tenantId: 1, approverId: 1, status: 1 });

export default mongoose.model('ReportApproval', schema);
