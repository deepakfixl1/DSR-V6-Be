/**
 * softDelete.plugin.js
 * Adds deletedAt and deletedBy for logical deletes. Excludes soft-deleted docs from default queries.
 */

import mongoose from 'mongoose';

/**
 * @param {import('mongoose').Schema} schema
 */
export function softDeletePlugin(schema) {
  schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });
  schema.index({ deletedAt: 1 });
  schema.pre(/^find(?!OneAndDelete|ByIdAndDelete)/, function () {
    const filter = this.getFilter();
    if (filter?.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });
  schema.static('findIncludingDeleted', function (filter = {}) {
    return this.find(filter);
  });
  schema.static('restore', function (id, by) {
    return this.findByIdAndUpdate(id, { $set: { deletedAt: null, deletedBy: null } }, { new: true });
  });
}
