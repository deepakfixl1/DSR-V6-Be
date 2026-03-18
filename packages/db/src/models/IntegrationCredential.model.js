/**
 * IntegrationCredential model. Encrypted credentials for integrations (tokens, secrets).
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';
import { encryptFieldsPlugin } from '../plugins/encryptFields.plugin.js';
import { immutableFieldsPlugin } from '../plugins/immutableFields.plugin.js';

const schema = new mongoose.Schema(
  {
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', required: true },
    kind: { type: String, required: true, trim: true },
    credentialEncrypted: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);
schema.plugin(immutableFieldsPlugin, { fields: ['integrationId', 'kind'] });
schema.plugin(encryptFieldsPlugin, { fields: ['credentialEncrypted'] });

schema.index({ tenantId: 1, integrationId: 1, kind: 1 }, { unique: true });

export default mongoose.model('IntegrationCredential', schema);
