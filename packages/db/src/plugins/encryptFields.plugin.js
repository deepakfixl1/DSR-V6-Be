/**
 * encryptFields.plugin.js
 * Encrypts specified string fields at rest. Expects options.encrypt and options.decrypt (async) from caller.
 */

/**
 * @param {import('mongoose').Schema} schema
 * @param {{ fields: string[], encrypt: (value: string) => Promise<string>, decrypt: (value: string) => Promise<string> }} options
 */
export function encryptFieldsPlugin(schema, options) {
  const { fields = [], encrypt, decrypt } = options;
  if (!fields.length || typeof encrypt !== 'function' || typeof decrypt !== 'function') return;
  for (const field of fields) {
    const def = schema.path(field);
    if (!def) schema.add({ [field]: { type: String, default: null } });
  }
  schema.pre('save', async function (next) {
    try {
      for (const field of fields) {
        const v = this.get(field);
        if (v != null && typeof v === 'string') this.set(field, await encrypt(v));
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  schema.post(/^find/, async function (docs) {
    const list = Array.isArray(docs) ? docs : (docs ? [docs] : []);
    for (const doc of list) {
      if (!doc) continue;
      for (const field of fields) {
        const v = doc[field];
        if (v != null && typeof v === 'string') doc[field] = await decrypt(v);
      }
    }
  });
  schema.method('decryptFields', async function () {
    const obj = this.toObject();
    for (const field of fields) {
      if (obj[field] != null && typeof obj[field] === 'string') obj[field] = await decrypt(obj[field]);
    }
    return obj;
  });
}
