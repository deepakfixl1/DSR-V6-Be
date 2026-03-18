/**
 * AuditLog model. Immutable audit trail of important actions (who, what, when, diff).
 * All writes are insert-only; updates and deletes are blocked.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    diff: { type: mongoose.Schema.Types.Mixed, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    entityType: { type: String, default: null, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

/** Prevent updates and deletes; AuditLog is insert-only. */
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], function (next) {
  next(new Error('AuditLog is immutable; updates are not allowed'));
});
schema.pre(['deleteOne', 'deleteMany'], function (next) {
  next(new Error('AuditLog is immutable; deletes are not allowed'));
});
schema.pre('save', function (next) {
  if (!this.isNew) {
    next(new Error('AuditLog is immutable; updates are not allowed'));
  } else {
    next();
  }
});

/** Tenant-isolated indexes for efficient queries. */
schema.index({ tenantId: 1, createdAt: -1 });
schema.index({ tenantId: 1, action: 1, createdAt: -1 });
schema.index({ tenantId: 1, resourceType: 1, resourceId: 1 });
schema.index({ tenantId: 1, userId: 1, createdAt: -1 });
schema.index({ tenantId: 1, entityType: 1, entityId: 1 });
schema.index({ tenantId: 1, actorId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', schema);
