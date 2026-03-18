/**
 * auditChain.plugin.js
 * Adds createdBy, updatedBy and optional audit trail for who changed what and when.
 */

import mongoose from 'mongoose';

/**
 * @param {import('mongoose').Schema} schema
 * @param {{ chain?: boolean }} [options] - chain: store full history in auditChain array
 */
export function auditChainPlugin(schema, options = {}) {
  schema.add({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });
  if (options.chain) {
    schema.add({
      auditChain: [{
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String },
        changes: { type: mongoose.Schema.Types.Mixed },
      }],
    });
  }
  schema.pre('save', function (next) {
    if (this.isNew) return next();
    if (this.$__.auditUpdatedBy) this.updatedBy = this.$__.auditUpdatedBy;
    next();
  });
}
