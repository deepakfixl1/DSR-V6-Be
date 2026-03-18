/**
 * Role model. Global RBAC roles with embedded permission strings.
 * Roles are NOT tenant-scoped — they are shared across the platform.
 * Users reference roleIds; permissions are embedded as string arrays.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: null },
    isPlatformRole: { type: Boolean, default: false },
    permissions: [{ type: String, trim: true }],
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(auditChainPlugin);

schema.index({ isPlatformRole: 1 });

export default mongoose.model('Role', schema);
