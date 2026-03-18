/**
 * Permission model. Defines granular permissions (e.g. task:create, report:read) for RBAC.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    description: { type: String, default: null },
    resource: { type: String, trim: true },
    action: { type: String, trim: true },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, key: 1 }, { unique: true });
schema.index({ tenantId: 1, resource: 1 });

export default mongoose.model('Permission', schema);
