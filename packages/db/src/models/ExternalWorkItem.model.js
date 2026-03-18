/**
 * ExternalWorkItem model. Synced work items from integrations (Jira issue, GitHub PR) linked to internal tasks.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', required: true },
    externalId: { type: String, required: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, default: null },
    url: { type: String, default: null },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: Date.now },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, integrationId: 1, externalId: 1 }, { unique: true });
schema.index({ tenantId: 1, taskId: 1 });
schema.index({ tenantId: 1, syncedAt: -1 });

export default mongoose.model('ExternalWorkItem', schema);
