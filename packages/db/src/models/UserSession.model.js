/**
 * UserSession model. Tracks active sessions for auth and revocation (logout, revoke-all).
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";

const schema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  refreshTokenHash: { type: String, required: true },
  deviceId: { type: String, required: true },
  userAgent: { type: String, default: null },
  ip: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
});

schema.plugin(toJSONPlugin);

schema.index({ userId: 1, deviceId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.UserSession || mongoose.model("UserSession", schema);
