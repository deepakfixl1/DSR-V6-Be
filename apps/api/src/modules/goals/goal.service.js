import mongoose from "mongoose";
import Goal from "#db/models/Goal.model.js";
import { TenantMembership } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { emitEvent } from "#api/modules/events/eventBus.js";
import { createNotification } from "#api/modules/notification/notification.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export async function createGoal({ tenantId, actorId, payload, meta }) {
  const goal = await Goal.create({
    tenantId: toObjectId(tenantId),
    type: payload.type,
    parentGoalId: payload.parentGoalId ? toObjectId(payload.parentGoalId) : null,
    ownerId: toObjectId(payload.ownerId),
    teamId: payload.teamId ? toObjectId(payload.teamId) : null,
    departmentId: payload.departmentId ? toObjectId(payload.departmentId) : null,
    title: payload.title,
    description: payload.description ?? null,
    period: payload.period,
    keyResults: payload.keyResults ?? [],
    weightage: payload.weightage ?? 1,
    progress: payload.progress ?? 0,
    status: payload.status ?? "not_started",
    AIInsights: payload.AIInsights ?? {},
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "goal",
    entityId: goal._id,
    action: "create",
    after: goal.toObject(),
    meta,
  });

  emitEvent("goal.created", { tenantId, goalId: goal._id });

  // Notify the goal owner if they are not the creator
  try {
    if (goal.ownerId && String(goal.ownerId) !== String(actorId)) {
      const ownerMembership = await TenantMembership.findOne({
        userId: goal.ownerId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (ownerMembership?.userId) {
        await createNotification({
          userId: ownerMembership.userId,
          memberId: ownerMembership._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "GOAL_ASSIGNED",
          title: "New goal assigned to you",
          body: `You have been assigned a new goal: "${goal.title}"`,
          link: `/goals/${goal._id}`,
          priority: "normal",
          payload: { goalId: String(goal._id), type: goal.type },
        });
      }
    }
  } catch (_) { /* non-blocking */ }

  return goal.toObject();
}

export async function listGoals({ tenantId, query }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const filter = { tenantId: toObjectId(tenantId) };
  if (query.ownerId) filter.ownerId = toObjectId(query.ownerId);
  if (query.type) filter.type = query.type;
  if (query.period) filter["period.type"] = query.period;
  if (query.departmentId) filter.departmentId = toObjectId(query.departmentId);

  const [docs, total] = await Promise.all([
    Goal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Goal.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getGoalById({ tenantId, id }) {
  const goal = await Goal.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!goal) throw ApiError.notFound("Goal not found");
  return goal;
}

export async function updateGoal({ tenantId, id, payload, actorId, meta }) {
  const goal = await Goal.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!goal) throw ApiError.notFound("Goal not found");

  const before = goal.toObject();
  if (payload.parentGoalId !== undefined) {
    goal.parentGoalId = payload.parentGoalId ? toObjectId(payload.parentGoalId) : null;
  }
  const prevOwnerId = String(goal.ownerId ?? "");
  const prevStatus = goal.status;
  if (payload.ownerId !== undefined) goal.ownerId = toObjectId(payload.ownerId);
  if (payload.teamId !== undefined) goal.teamId = payload.teamId ? toObjectId(payload.teamId) : null;
  if (payload.departmentId !== undefined) {
    goal.departmentId = payload.departmentId ? toObjectId(payload.departmentId) : null;
  }
  if (payload.title !== undefined) goal.title = payload.title;
  if (payload.description !== undefined) goal.description = payload.description;
  if (payload.period !== undefined) goal.period = payload.period;
  if (payload.keyResults !== undefined) goal.keyResults = payload.keyResults;
  if (payload.weightage !== undefined) goal.weightage = payload.weightage;
  if (payload.progress !== undefined) goal.progress = payload.progress;
  if (payload.status !== undefined) goal.status = payload.status;
  if (payload.AIInsights !== undefined) goal.AIInsights = payload.AIInsights;

  const ownerChanged = payload.ownerId !== undefined && prevOwnerId !== String(goal.ownerId ?? "");
  const statusChanged = payload.status !== undefined && prevStatus !== goal.status;

  await goal.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "goal",
    entityId: goal._id,
    action: "update",
    before,
    after: goal.toObject(),
    meta,
  });

  // Notify new owner if ownership was transferred
  try {
    if (ownerChanged && goal.ownerId && String(goal.ownerId) !== String(actorId)) {
      const ownerMembership = await TenantMembership.findOne({
        userId: goal.ownerId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (ownerMembership?.userId) {
        await createNotification({
          userId: ownerMembership.userId,
          memberId: ownerMembership._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "GOAL_ASSIGNED",
          title: "Goal assigned to you",
          body: `You have been assigned a goal: "${goal.title}"`,
          link: `/goals/${goal._id}`,
          priority: "normal",
          payload: { goalId: String(goal._id) },
        });
      }
    }
    // Notify owner of status change (completed, blocked, etc.)
    if (statusChanged && goal.ownerId && String(goal.ownerId) !== String(actorId)) {
      const statusLabels = { completed: "completed", blocked: "blocked", in_progress: "started", not_started: "reset" };
      const label = statusLabels[goal.status] ?? goal.status;
      const ownerMembership = await TenantMembership.findOne({
        userId: goal.ownerId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (ownerMembership?.userId) {
        await createNotification({
          userId: ownerMembership.userId,
          memberId: ownerMembership._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "GOAL_STATUS_CHANGED",
          title: `Goal ${label}`,
          body: `Your goal "${goal.title}" has been marked as ${label}.`,
          link: `/goals/${goal._id}`,
          priority: goal.status === "blocked" ? "high" : "normal",
          payload: { goalId: String(goal._id), status: goal.status },
        });
      }
    }
  } catch (_) { /* non-blocking */ }

  return goal.toObject();
}

export async function deleteGoal({ tenantId, id, actorId, meta }) {
  const goal = await Goal.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!goal) throw ApiError.notFound("Goal not found");

  const before = goal.toObject();
  await goal.deleteOne();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "goal",
    entityId: goal._id,
    action: "delete",
    before,
    after: null,
    meta,
  });

  return { success: true };
}

export async function updateKeyResult({ tenantId, id, krIndex, currentValue, actorId, meta }) {
  const goal = await Goal.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!goal) throw ApiError.notFound("Goal not found");
  if (!goal.keyResults?.[krIndex]) {
    throw ApiError.badRequest("Key result not found");
  }

  const before = goal.toObject();
  goal.keyResults[krIndex].currentValue = currentValue;
  await goal.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "goal",
    entityId: goal._id,
    action: "update",
    before,
    after: goal.toObject(),
    meta,
  });

  emitEvent("goal.key_result_updated", { tenantId, goalId: goal._id, krIndex });
  return goal.toObject();
}
