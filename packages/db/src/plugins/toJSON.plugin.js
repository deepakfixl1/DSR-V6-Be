/**
 * toJSON.plugin.js
 * Standardizes document serialization: strips __v, maps _id to id, removes internal paths.
 * Applied to all schemas for consistent API responses.
 */

/**
 * @param {import('mongoose').Schema} schema
 */
export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}
