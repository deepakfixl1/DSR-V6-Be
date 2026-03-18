/**
 * TaskActivity model. Audit trail of comments and status changes on tasks.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', required: true },
    type: { type: String, enum: ['comment', 'status_change', 'assignment', 'edit'], required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, taskId: 1, createdAt: -1 });
schema.index({ tenantId: 1, memberId: 1, createdAt: -1 });

export default mongoose.model('TaskActivity', schema);
