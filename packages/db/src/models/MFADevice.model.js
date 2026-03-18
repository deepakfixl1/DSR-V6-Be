/**
 * MFADevice model. Stores MFA device/credential bindings per user (TOTP, backup codes, WebAuthn).
 * Uses speakeasy for TOTP, bcrypt for backup codes.
 */

import mongoose from 'mongoose';
import { toJSONPlugin } from '../plugins/toJSON.plugin.js';
import { tenantPlugin } from '../plugins/tenant.plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    
    type: { 
      type: String, 
      enum: ['totp', 'webauthn'], 
      required: true,
      index: true
    },
    
    // TOTP: base32 secret from speakeasy
    secret: { 
      type: String, 
      default: null 
    },
    
    // Backup codes: bcrypt hashed array
    backupCodesHashed: { 
      type: [String], 
      default: [] 
    },
    
    name: { 
      type: String, 
      trim: true,
      default: 'Authenticator App'
    },
    
    verifiedAt: { 
      type: Date, 
      default: null,
      index: true
    },
    
    lastUsedAt: { 
      type: Date, 
      default: null 
    },
    
    revokedAt: { 
      type: Date, 
      default: null,
      index: true
    },
    
    attempts: { 
      type: Number, 
      default: 0,
      min: 0
    },
    
    lockedUntil: { 
      type: Date, 
      default: null 
    },
    
    // WebAuthn placeholder
    webauthn: {
      credentialId: { type: String, default: null },
      publicKey: { type: String, default: null },
      counter: { type: Number, default: 0 },
      transports: { type: [String], default: [] }
    },
    
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { 
    strict: true, 
    minimize: false, 
    timestamps: true, 
    optimisticConcurrency: true 
  }
);

schema.plugin(toJSONPlugin);
schema.plugin(tenantPlugin);

schema.index({ tenantId: 1, userId: 1, type: 1 }, { unique: true });
schema.index({ tenantId: 1, userId: 1, verifiedAt: 1 });
schema.index({ tenantId: 1, userId: 1, revokedAt: 1 });

schema.virtual('isActive').get(function() {
  return this.verifiedAt && !this.revokedAt;
});

schema.virtual('isLocked').get(function() {
  return this.lockedUntil && new Date(this.lockedUntil) > new Date();
});

export default mongoose.model('MFADevice', schema);
