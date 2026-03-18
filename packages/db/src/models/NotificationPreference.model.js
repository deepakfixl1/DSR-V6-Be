/**
 * NotificationPreference model. Per-user preferences for notification channels and types.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', default: null },
    channel: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, userId: 1, channel: 1, type: 1 }, { unique: true });

export default mongoose.model('NotificationPreference', schema);
