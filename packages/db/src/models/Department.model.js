/**
 * Department model. Tenant-scoped unit with optional manager membership.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';
import { paginatePlugin } from '../plugins/paginate.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: null },
    type: {
  type: String,
  enum: ["SALES", "IT", "HR", "FINANCE", "MARKETING", "OPERATIONS"],
  required: true,
  index: true,
},
status: {
  type: String,
  enum: ["ACTIVE", "INACTIVE"],
  default: "ACTIVE",
  index: true
},
    // Primary/legacy single manager (kept for backward-compat)
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenantMembership',
      default: null,
    },
    // Multiple managers — use this for new assignments
    managerIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership' }],
      default: [],
    },
    // Department head (senior role, separate from managers)
    departmentHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenantMembership',
      default: null,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportTemplate",
      default: null,
    },
    customTemplateEnabled: { type: Boolean, default: false },
    customTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportTemplate",
      default: null,
    },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(softDeletePlugin);
schema.plugin(paginatePlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, slug: 1, deletedAt: 1 }, { unique: true });

schema.index({ tenantId: 1, type: 1, deletedAt: 1 });

schema.index({ tenantId: 1, managerId: 1, deletedAt: 1 });

schema.index({ tenantId: 1, status: 1, deletedAt: 1 });;

export default mongoose.model('Department', schema);
