/**
 * Notification model. In-app or push notifications for users (read/unread, link, payload).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', default: null },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: null },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
    priority: { type: String, enum: ['low','normal','high','critical'], default: 'normal', index: true },
    scope: { type: String, enum: ['user','tenant','global','both'], default: 'user', index: true },

    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

/** Optimized indexes for tenant isolation, user queries, unread count, and priority filtering. */
schema.index({ tenantId: 1, userId: 1, readAt: 1 });
schema.index({ tenantId: 1, userId: 1, createdAt: -1 });
schema.index({ tenantId: 1, userId: 1, readAt: 1, priority: -1 });
schema.index({ tenantId: 1, memberId: 1, createdAt: -1 });

export default mongoose.model('Notification', schema);
