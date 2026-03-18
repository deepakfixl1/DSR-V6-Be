/**
 * Task model. Core work item; stores title, status, assignee, due date for task management.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';
import { paginatePlugin } from '../plugins/paginate.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: { type: String, enum: ['open', 'in_progress', 'done', 'cancelled'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(softDeletePlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, status: 1 });
schema.index({ tenantId: 1, assigneeId: 1, status: 1 });
schema.index({ tenantId: 1, departmentId: 1, status: 1 });
schema.index({ tenantId: 1, projectId: 1, status: 1 });
schema.index({ tenantId: 1, dueAt: 1 });
schema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Task', schema);
