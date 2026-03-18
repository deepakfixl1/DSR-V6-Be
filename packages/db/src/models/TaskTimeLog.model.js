/**
 * TaskTimeLog model. Time entries for tasks (billable/non-billable, start/end).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    minutes: { type: Number, default: 0 },
    billable: { type: Boolean, default: false },
    note: { type: String, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.pre('validate', function calculateMinutes(next) {
  if (!this.startedAt || !this.endedAt) {
    return next();
  }
  if (this.endedAt <= this.startedAt) {
    this.invalidate('endedAt', 'endedAt must be greater than startedAt');
    return next();
  }
  const diffMs = this.endedAt.getTime() - this.startedAt.getTime();
  this.minutes = Math.ceil(diffMs / 60000);
  return next();
});

schema.index({ tenantId: 1, taskId: 1, startedAt: -1 });
schema.index({ tenantId: 1, memberId: 1, startedAt: -1 });
schema.index({ tenantId: 1, memberId: 1, endedAt: 1 });

export default mongoose.model('TaskTimeLog', schema);
