/**
 * paginate.plugin.js
 * Adds paginate() static for cursor or offset-based pagination with sort and projection.
 */

/**
 * @param {import('mongoose').Schema} schema
 */
export function paginatePlugin(schema) {
  schema.static('paginate', async function (filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 }, projection = null } = options;
    const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100));
    const query = this.find(filter).sort(sort).skip(skip).limit(Math.max(1, Math.min(limit, 100)));
    if (projection) query.select(projection);
    const [docs, total] = await Promise.all([query.lean(), this.countDocuments(filter)]);
    return { docs, total, page: Math.max(1, page), limit: Math.max(1, Math.min(limit, 100)), pages: Math.ceil(total / Math.max(1, limit)) };
  });
}
