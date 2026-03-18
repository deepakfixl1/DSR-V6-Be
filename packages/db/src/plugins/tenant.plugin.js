/**
 * tenant.plugin.js
 * Adds tenantId to schema and compound index for tenant-scoped queries.
 * Use on all schemas that belong to a tenant.
 */

import mongoose from 'mongoose';

/**
 * @param {import('mongoose').Schema} schema
 * @param {{ index?: boolean }} [options]
 */
export function tenantPlugin(schema, options = {}) {
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },
  });
  if (options.index !== false) {
    schema.index({ tenantId: 1 });
  }
}
