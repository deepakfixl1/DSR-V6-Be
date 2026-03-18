/**
 * immutableFields.plugin.js
 * Prevents updates to specified fields after document creation.
 */

/**
 * @param {import('mongoose').Schema} schema
 * @param {{ fields: string[] }} options
 */
export function immutableFieldsPlugin(schema, options = {}) {
  const fields = options.fields || [];
  schema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    const mod = update?.$set || update;
    if (mod && typeof mod === 'object') {
      for (const key of fields) {
        if (key in mod) {
          delete mod[key];
          if (update?.$set && update.$set === mod) update.$set = mod;
        }
      }
    }
    next();
  });
  schema.pre('updateOne', function (next) {
    const update = this.getUpdate();
    const mod = update?.$set || update;
    if (mod && typeof mod === 'object') {
      for (const key of fields) {
        if (key in mod) delete mod[key];
      }
    }
    next();
  });
}
