import mongoose from "mongoose";
import { AIUsagePolicy } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export async function createPolicy({ tenantId, actorId, payload, meta }) {
  const policy = await AIUsagePolicy.create({
    tenantId: toObjectId(tenantId),
    name: payload.name,
    description: payload.description ?? "",
    scope: payload.scope,
    scopeId: payload.scopeId ? toObjectId(payload.scopeId) : null,
    limits: payload.limits,
    status: payload.status ?? "active",
    createdBy: actorId ? toObjectId(actorId) : null,
  });

  await recordAudit({
    tenantId, actorId,
    entityType: "ai_usage_policy", entityId: policy._id,
    action: "create", after: policy.toObject(), meta,
  });

  return policy.toObject();
}

export async function listPolicies({ tenantId, query = {} }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const filter = { tenantId: toObjectId(tenantId) };
  if (query.status) filter.status = query.status;
  if (query.scope) filter.scope = query.scope;

  const [docs, total] = await Promise.all([
    AIUsagePolicy.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AIUsagePolicy.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getPolicy({ tenantId, id }) {
  const policy = await AIUsagePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) }).lean();
  if (!policy) throw ApiError.notFound("AI usage policy not found");
  return policy;
}

export async function updatePolicy({ tenantId, id, payload, actorId, meta }) {
  const policy = await AIUsagePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("AI usage policy not found");

  const before = policy.toObject();
  const updatable = ["name", "description", "scope", "limits", "status"];
  for (const key of updatable) {
    if (payload[key] !== undefined) policy[key] = payload[key];
  }
  if (payload.scopeId !== undefined) {
    policy.scopeId = payload.scopeId ? toObjectId(payload.scopeId) : null;
  }
  await policy.save();

  await recordAudit({
    tenantId, actorId,
    entityType: "ai_usage_policy", entityId: policy._id,
    action: "update", before, after: policy.toObject(), meta,
  });

  return policy.toObject();
}

export async function deletePolicy({ tenantId, id, actorId, meta }) {
  const policy = await AIUsagePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("AI usage policy not found");

  const before = policy.toObject();
  if (typeof policy.softDelete === "function") {
    await policy.softDelete(actorId);
  } else {
    await policy.deleteOne();
  }

  await recordAudit({
    tenantId, actorId,
    entityType: "ai_usage_policy", entityId: policy._id,
    action: "delete", before, after: null, meta,
  });

  return { success: true };
}

export async function togglePolicy({ tenantId, id, actorId, meta }) {
  const policy = await AIUsagePolicy.findOne({ _id: toObjectId(id), tenantId: toObjectId(tenantId) });
  if (!policy) throw ApiError.notFound("AI usage policy not found");

  const before = policy.toObject();
  policy.status = policy.status === "active" ? "paused" : "active";
  await policy.save();

  await recordAudit({
    tenantId, actorId,
    entityType: "ai_usage_policy", entityId: policy._id,
    action: "toggle", before, after: policy.toObject(), meta,
  });

  return policy.toObject();
}
