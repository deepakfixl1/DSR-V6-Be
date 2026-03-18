/**
 * SecurityConfig model. Platform-level singleton for security policies,
 * blocked IPs, and compliance tracking. One document per platform (_type: 'platform').
 */

import mongoose from 'mongoose'
import { toJSONPlugin } from '../plugins/toJSON.plugin.js'

const blockedIpSchema = new mongoose.Schema(
  {
    id: { type: String },
    ip: { type: String, required: true },
    reason: { type: String, default: 'Manual block' },
    blocked_at: { type: String },
    count: { type: Number, default: 0 },
  },
  { _id: false }
)

const schema = new mongoose.Schema(
  {
    _type: { type: String, default: 'platform', unique: true },
    policies: { type: mongoose.Schema.Types.Mixed, default: [] },
    blockedIps: { type: [blockedIpSchema], default: [] },
    compliance: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

schema.plugin(toJSONPlugin)

export default mongoose.model('SecurityConfig', schema)
