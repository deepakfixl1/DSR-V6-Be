/**
 * Tenant model. Root of tenancy; stores organization/workspace identity and slug for scoping all tenant data.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
    logoUrl: { type: String, default: null, trim: true },
    timezone: { type: String, default: "UTC", trim: true },
    industry: { type: String, default: null, trim: true },
    maxMembers: { type: Number, default: null, min: 1 },
    suspendedUntil: { type: Date, default: null },
    readOnlyMode: { type: Boolean, default: false },
    readOnlyUntil: { type: Date, default: null },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlanCatalog', default: null, index: true },
    stripeCustomerId: { type: String, default: null, trim: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(softDeletePlugin);
schema.plugin(auditChainPlugin);

schema.index({ status: 1, deletedAt: 1 });

export default mongoose.model('Tenant', schema);
