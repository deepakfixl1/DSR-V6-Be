/**
 * DataAccessGrant model. Records delegated or temporary data access (e.g. report access, export grants).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    scope: { type: String, enum: ['read', 'write', 'admin'], default: 'read' },
    expiresAt: { type: Date, required: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, userId: 1, resourceType: 1 });
schema.index({ tenantId: 1, resourceType: 1, resourceId: 1 });
schema.index({ expiresAt: 1 });

export default mongoose.model('DataAccessGrant', schema);
