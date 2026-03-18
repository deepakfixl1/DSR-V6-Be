/**
 * TenantInvite model. Stores hashed invite tokens for member invitations with TTL.
 * Token must be hashed before storing; never store plain tokens.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { auditChainPlugin } from '../plugins/auditChain.plugin.js';

const schema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);
schema.plugin(auditChainPlugin);

schema.index({ tenantId: 1, email: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL: remove doc when expiresAt is reached

export default mongoose.model('TenantInvite', schema);
