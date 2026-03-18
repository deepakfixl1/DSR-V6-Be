import mongoose from "mongoose";
import { AutomationRule, AutomationRuleLog } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { executeRule } from "./automation.engine.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createRule({ tenantId, actorId, payload, meta }) {
  const rule = await AutomationRule.create({
    tenantId: toObjectId(tenantId),
    name: payload.name,
    description: payload.description ?? "",
    status: payload.status ?? "draft",
    trigger: payload.trigger,
    conditions: payload.conditions ?? [],
    actions: payload.actions,
    createdBy: actorId ? toObjectId(actorId) : null,
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "automation_rule",
    entityId: rule._id,
    action: "create",
    after: rule.toObject(),
    meta,
  });

  return rule.toObject();
}

export async function listRules({ tenantId, query }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const filter = { tenantId: toObjectId(tenantId) };
  if (query.status) filter.status = query.status;
  if (query.trigger) filter["trigger.event"] = query.trigger;

  const [docs, total] = await Promise.all([
    AutomationRule.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AutomationRule.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getRule({ tenantId, id }) {
  const rule = await AutomationRule.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!rule) throw ApiError.notFound("Automation rule not found");
  return rule;
}

export async function updateRule({ tenantId, id, payload, actorId, meta }) {
  const rule = await AutomationRule.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!rule) throw ApiError.notFound("Automation rule not found");

  const before = rule.toObject();
  if (payload.name !== undefined) rule.name = payload.name;
  if (payload.description !== undefined) rule.description = payload.description;
  if (payload.status !== undefined) rule.status = payload.status;
  if (payload.trigger !== undefined) rule.trigger = payload.trigger;
  if (payload.conditions !== undefined) rule.conditions = payload.conditions;
  if (payload.actions !== undefined) rule.actions = payload.actions;
  await rule.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "automation_rule",
    entityId: rule._id,
    action: "update",
    before,
    after: rule.toObject(),
    meta,
  });

  return rule.toObject();
}

export async function deleteRule({ tenantId, id, actorId, meta }) {
  const rule = await AutomationRule.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!rule) throw ApiError.notFound("Automation rule not found");

  const before = rule.toObject();

  // If model has soft-delete plugin it marks deletedAt; otherwise hard-delete
  if (typeof rule.softDelete === "function") {
    await rule.softDelete(actorId);
  } else {
    await rule.deleteOne();
  }

  await recordAudit({
    tenantId,
    actorId,
    entityType: "automation_rule",
    entityId: rule._id,
    action: "delete",
    before,
    after: null,
    meta,
  });

  return { success: true };
}

export async function toggleRule({ tenantId, id, actorId, meta }) {
  const rule = await AutomationRule.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!rule) throw ApiError.notFound("Automation rule not found");

  const before = rule.toObject();
  rule.status = rule.status === "active" ? "paused" : "active";
  await rule.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "automation_rule",
    entityId: rule._id,
    action: "toggle",
    before,
    after: rule.toObject(),
    meta,
  });

  return rule.toObject();
}

// ─── Manual Run ──────────────────────────────────────────────────────────────

export async function runRule({ tenantId, id, actorId, meta }) {
  const rule = await AutomationRule.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!rule) throw ApiError.notFound("Automation rule not found");

  const result = await executeRule(rule, { manual: true, actorId }, tenantId);
  return result;
}

// ─── Logs ────────────────────────────────────────────────────────────────────

export async function listLogs({ tenantId, ruleId, page = 1, limit = 20 }) {
  page = Math.max(1, page);
  limit = Math.min(100, Math.max(1, limit));
  const filter = {
    tenantId: toObjectId(tenantId),
    ruleId: toObjectId(ruleId),
  };

  const [docs, total] = await Promise.all([
    AutomationRuleLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AutomationRuleLog.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats({ tenantId }) {
  const tenantObjectId = toObjectId(tenantId);

  const [statusCounts, logStats] = await Promise.all([
    AutomationRule.aggregate([
      { $match: { tenantId: tenantObjectId, deletedAt: { $eq: null } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    AutomationRuleLog.aggregate([
      { $match: { tenantId: tenantObjectId } },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          failedRuns: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const logAgg = logStats[0] ?? { totalRuns: 0, failedRuns: 0 };

  return {
    total,
    active: byStatus.active ?? 0,
    paused: byStatus.paused ?? 0,
    draft: byStatus.draft ?? 0,
    totalRuns: logAgg.totalRuns,
    failedRuns: logAgg.failedRuns,
  };
}
