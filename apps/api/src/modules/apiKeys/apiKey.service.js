import crypto from "node:crypto";
import mongoose from "mongoose";
import { ApiKey } from "#db/models/index.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const hashKey = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

export async function listApiKeys({ tenantId, actorId }) {
  return ApiKey.find({
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
  }).sort({ createdAt: -1 }).lean();
}

export async function createApiKey({ tenantId, actorId, payload, meta = {} }) {
  const rawKey = crypto.randomBytes(32).toString("hex");
  const keyPrefix = rawKey.slice(0, 8);
  const doc = await ApiKey.create({
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
    name: payload.name,
    scopes: payload.scopes ?? [],
    keyPrefix,
    keyHash: hashKey(rawKey),
    expiresAt: payload.expiresAt ?? null,
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "api_key",
    entityId: doc._id,
    action: "create",
    after: doc.toObject(),
    meta,
  });

  return { apiKey: doc.toObject(), secret: `${keyPrefix}.${rawKey}` };
}

export async function updateApiKey({ tenantId, actorId, id, payload, meta = {} }) {
  const doc = await ApiKey.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
  });
  if (!doc) return null;
  const before = doc.toObject();

  if (payload.name !== undefined) doc.name = payload.name;
  if (payload.scopes !== undefined) doc.scopes = payload.scopes;
  if (payload.expiresAt !== undefined) doc.expiresAt = payload.expiresAt;
  await doc.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "api_key",
    entityId: doc._id,
    action: "update",
    before,
    after: doc.toObject(),
    meta,
  });

  return doc.toObject();
}

export async function deleteApiKey({ tenantId, actorId, id, meta = {} }) {
  const doc = await ApiKey.findOneAndDelete({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
    userId: toObjectId(actorId),
  });
  if (!doc) return null;

  await recordAudit({
    tenantId,
    actorId,
    entityType: "api_key",
    entityId: doc._id,
    action: "delete",
    before: doc.toObject(),
    after: null,
    meta,
  });

  return { success: true };
}
