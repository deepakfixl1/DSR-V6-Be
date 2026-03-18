import mongoose from "mongoose";
import WorkGoal from "#db/models/WorkGoal.model.js";
import WeekCycle from "#db/models/WeekCycle.model.js";
import Department from "#db/models/Department.model.js";
import GoalProgressHistory from "#db/models/GoalProgressHistory.model.js";
import { TenantMembership, User } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
import { enqueueEmail } from "#infra/queue/email.queue.js";
import { logger } from "#api/utils/logger.js";
import { publishWsEvent } from "#api/modules/events/ws.events.js";

const toObjectId = (value, field = "id") => {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${field}`);
  }
  return new mongoose.Types.ObjectId(String(value));
};

const buildMeta = (meta = {}, extra = {}) => ({
  module: "work-goal",
  timestamp: new Date().toISOString(),
  ...meta,
  ...extra,
});

const safeRecordAudit = async (payload) => {
  try {
    await recordAudit(payload);
  } catch (error) {
    logger.error({ err: error, payload }, "Failed to record work-goal audit");
  }
};

const mapMongoError = (error) => {
  if (error?.code === 11000) {
    return ApiError.conflict("Duplicate record", { key: error.keyValue });
  }
  return error;
};

const withService = async ({ tenantId, actorId, entityType, entityId, action, meta, execute }) => {
  try {
    logger.info({ tenantId, actorId, entityType, entityId, action }, "work-goal service started");
    const result = await execute();
    logger.info({ tenantId, actorId, entityType, entityId, action }, "work-goal service completed");
    return result;
  } catch (rawError) {
    const error = mapMongoError(rawError);
    logger.error({ tenantId, actorId, entityType, entityId, action, err: error }, "work-goal service failed");

    await safeRecordAudit({
      tenantId,
      actorId,
      entityType,
      entityId,
      action: `${action}_failed`,
      meta: buildMeta(meta, {
        success: false,
        errorMessage: error.message,
        statusCode: error.statusCode ?? 500,
      }),
    });

    throw error;
  }
};

const assertWeekCycleExists = async ({ tenantId, weekCycleId, session = null }) => {
  const exists = await WeekCycle.findOne({
    _id: toObjectId(weekCycleId, "weekCycleId"),
    tenantId: toObjectId(tenantId, "tenantId"),
  }).session(session).lean();

  if (!exists) throw ApiError.badRequest("WeekCycle not found");
  return exists;
};

const assertDepartmentExists = async ({ tenantId, departmentId, session = null }) => {
  const exists = await Department.findOne({
    _id: toObjectId(departmentId, "departmentId"),
    tenantId: toObjectId(tenantId, "tenantId"),
  }).session(session).lean();

  if (!exists) throw ApiError.badRequest("Department not found");
  return exists;
};

const findGoalOrThrow = async ({ tenantId, id, session = null }) => {
  const doc = await WorkGoal.findOne({
    _id: toObjectId(id, "workGoalId"),
    tenantId: toObjectId(tenantId, "tenantId"),
  }).session(session);

  if (!doc) throw ApiError.notFound("WorkGoal not found");
  return doc;
};

const recomputeWeekCycleSummary = async ({ tenantId, weekCycleId, session = null }) => {
  const tenantObjectId = toObjectId(tenantId, "tenantId");
  const weekCycleObjectId = toObjectId(weekCycleId, "weekCycleId");

  const goals = await WorkGoal.find({
    tenantId: tenantObjectId,
    weekCycleId: weekCycleObjectId,
  }).session(session).lean();

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
  const blockedGoals = goals.filter((g) => g.status === "BLOCKED").length;
  const carriedForwardGoals = goals.filter((g) => g.isCarriedForward).length;
  const completionPct = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  await WeekCycle.updateOne(
    { _id: weekCycleObjectId, tenantId: tenantObjectId },
    {
      $set: {
        carriedForwardGoalCount: carriedForwardGoals,
        summary: {
          totalGoals,
          completedGoals,
          blockedGoals,
          carriedForwardGoals,
          completionPct,
        },
      },
    },
    { session }
  );
};

const validateGoalPayload = async ({ tenantId, payload, session = null, currentId = null }) => {
  await assertWeekCycleExists({ tenantId, weekCycleId: payload.weekCycleId, session });
  await assertDepartmentExists({ tenantId, departmentId: payload.departmentId, session });

  if (payload.parentGoalId) {
    const parent = await WorkGoal.findOne({
      _id: toObjectId(payload.parentGoalId, "parentGoalId"),
      tenantId: toObjectId(tenantId, "tenantId"),
    }).session(session).lean();

    if (!parent) throw ApiError.badRequest("parentGoalId not found");
  }

  if (Array.isArray(payload.dependsOnGoalIds) && payload.dependsOnGoalIds.length) {
    const ids = payload.dependsOnGoalIds.map((id) => toObjectId(id, "dependsOnGoalId"));
    const count = await WorkGoal.countDocuments({
      _id: { $in: ids },
      tenantId: toObjectId(tenantId, "tenantId"),
    }).session(session);

    if (count !== ids.length) throw ApiError.badRequest("One or more dependsOnGoalIds are invalid");
  }

  if (payload.goalCode) {
    const duplicateQuery = {
      tenantId: toObjectId(tenantId, "tenantId"),
      goalCode: payload.goalCode,
    };
    if (currentId) duplicateQuery._id = { $ne: toObjectId(currentId, "workGoalId") };

    const duplicate = await WorkGoal.findOne(duplicateQuery).session(session).lean();
    if (duplicate) throw ApiError.conflict("goalCode already exists");
  }
};

const sanitizePayload = (payload = {}, actorId) => {
  const data = { ...payload };

  if (payload.departmentId) data.departmentId = toObjectId(payload.departmentId, "departmentId");
  if (payload.weekCycleId) data.weekCycleId = toObjectId(payload.weekCycleId, "weekCycleId");
  if (payload.assignedToMemberId) data.assignedToMemberId = toObjectId(payload.assignedToMemberId, "assignedToMemberId");
  if (payload.assignedBy) data.assignedBy = toObjectId(payload.assignedBy, "assignedBy");
  if (payload.parentGoalId !== undefined) data.parentGoalId = payload.parentGoalId ? toObjectId(payload.parentGoalId, "parentGoalId") : null;
  if (payload.originGoalId !== undefined) data.originGoalId = payload.originGoalId ? toObjectId(payload.originGoalId, "originGoalId") : null;
  if (payload.dependsOnGoalIds) data.dependsOnGoalIds = payload.dependsOnGoalIds.map((id) => toObjectId(id, "dependsOnGoalId"));

  if (payload.tags) data.tags = [...new Set(payload.tags.map((t) => t.trim()).filter(Boolean))];

  if (!data.assignedBy && actorId) {
    data.assignedBy = toObjectId(actorId, "actorId");
  }

  data.updatedByManagerId = toObjectId(actorId, "actorId");
  if (!data.createdByManagerId) {
    data.createdByManagerId = toObjectId(actorId, "actorId");
  }

  return data;
};

/** Statuses where no further write operations are allowed for the goal owner */
const LOCKED_CYCLE_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"]);

/**
 * Assert that the week cycle is still OPEN.
 * Managers (actorMembershipId !== assignedToMemberId) are exempt — they can
 * still edit goals on submitted cycles.
 */
async function assertCycleEditableByOwner({
  tenantId,
  weekCycleId,
  actorMembershipId,
  assignedToMemberId,
  goalApprovalStatus,
}) {
  if (!weekCycleId) return;
  const cycle = await WeekCycle.findOne({
    _id: toObjectId(weekCycleId, "weekCycleId"),
    tenantId: toObjectId(tenantId, "tenantId"),
  }).lean();
  if (!cycle) return;
  if (!LOCKED_CYCLE_STATUSES.has(cycle.status)) return; // OPEN — no restriction

  // Actor is the goal owner → block full CRUD; only status changes allowed
  const actorIsOwner = actorMembershipId && assignedToMemberId &&
    String(actorMembershipId) === String(assignedToMemberId);

  if (actorIsOwner) {
    // If a manager returned the goal for revision, the owner must be able to edit + resubmit it
    // even when the week cycle is already SUBMITTED/UNDER_REVIEW.
    if (goalApprovalStatus === "REJECTED" || goalApprovalStatus === "NEEDS_REVISION") return;
    throw ApiError.forbidden(
      "Week cycle has been submitted. You can only update the goal status with a note. Contact your manager for other changes."
    );
  }
  // Non-owner (manager/admin) → allowed to proceed
}

/**
 * Sends an in-app notification and email to the goal owner when a manager
 * (someone other than the assignee) updates or status-changes a goal.
 */
async function notifyGoalOwner({ tenantId, goal, actorId, changeType = "update" }) {
  try {
    if (!goal.assignedToMemberId) return;
    const membership = await TenantMembership.findById(goal.assignedToMemberId).lean();
    if (!membership?.userId) return;

    // Don't notify if the actor IS the goal owner
    if (String(membership.userId) === String(actorId)) return;

    const user = await User.findById(membership.userId).select("name email").lean();
    if (!user) return;

    const titleMap = {
      update: `Your goal was updated by a manager`,
      status: `Your goal status was changed`,
      delete: `Your goal was removed by a manager`,
    };
    const bodyMap = {
      update: `Your goal "${goal.title}" has been updated by your manager.`,
      status: `The status of your goal "${goal.title}" has been changed.`,
      delete: `Your goal "${goal.title}" has been removed by your manager.`,
    };

    await createNotification({
      userId: membership.userId,
      memberId: goal.assignedToMemberId,
      tenantId: toObjectId(tenantId, "tenantId"),
      scope: "user",
      type: changeType === "delete" ? "goal_deleted" : "goal_updated",
      title: titleMap[changeType] ?? titleMap.update,
      body: bodyMap[changeType] ?? bodyMap.update,
      link: `/goals/${String(goal._id)}`,
      priority: "normal",
      payload: { goalId: String(goal._id) },
    });

    if (user.email) {
      await enqueueEmail({
        to: user.email,
        subject: titleMap[changeType] ?? titleMap.update,
        html: `<p>Hi ${user.name ?? "there"},</p><p>${bodyMap[changeType] ?? bodyMap.update}</p>`,
      });
    }
  } catch (err) {
    logger.warn({ err }, "notifyGoalOwner failed — skipping");
  }
}

/**
 * Finds the department head for a goal's department and sends them
 * an in-app notification and an email.
 */
async function notifyDepartmentHead({ tenantId, goal, action }) {
  try {
    const departmentId = goal.departmentId;
    if (!departmentId) return;

    const dept = await Department.findOne({
      _id: departmentId,
      tenantId: toObjectId(tenantId, "tenantId"),
    }).lean();
    if (!dept?.managerId) return;

    // managerId on Department is a TenantMembership _id
    const membership = await TenantMembership.findById(dept.managerId).lean();
    if (!membership?.userId) return;

    const user = await User.findById(membership.userId).select("name email").lean();
    if (!user) return;

    const isCreate = action === "create";
    const notifTitle = isCreate
      ? `New goal created: ${goal.title}`
      : `Goal updated: ${goal.title}`;
    const notifBody = isCreate
      ? `A new weekly goal has been assigned to your department.`
      : `A goal in your department has been updated.`;

    await createNotification({
      userId: membership.userId,
      memberId: dept.managerId,
      tenantId: toObjectId(tenantId, "tenantId"),
      scope: "user",
      type: isCreate ? "goal_created" : "goal_updated",
      title: notifTitle,
      body: notifBody,
      link: `/goals/detail/${String(goal._id)}`,
      priority: "normal",
      payload: { goalId: String(goal._id), departmentId: String(departmentId) },
    });

    if (user.email) {
      await enqueueEmail({
        to: user.email,
        subject: notifTitle,
        html: `<p>Hi ${user.name ?? "there"},</p><p>${notifBody}</p><p><b>Goal:</b> ${goal.title}</p>`,
      });
    }
  } catch (err) {
    logger.warn({ err }, "notifyDepartmentHead failed — skipping");
  }
}

export async function listCurrentWeekGoals({ tenantId, employeeMemberId, date } = {}) {
  const query = {};
  if (tenantId && mongoose.isValidObjectId(String(tenantId))) {
    query.tenantId = toObjectId(tenantId, "tenantId");
  }
  if (employeeMemberId && mongoose.isValidObjectId(String(employeeMemberId))) {
    query.assignedToMemberId = toObjectId(employeeMemberId, "assignedToMemberId");
  }
  if (date) {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    query["timeline.dueDate"] = { $gte: weekStart, $lte: weekEnd };
  }
  const goals = await WorkGoal.find(query).sort({ createdAt: -1 }).limit(10).lean();
  return { goals };
}
export async function listPendingGoals({ tenantId, employeeMemberId }) {
  return WorkGoal.find({
    tenantId: toObjectId(tenantId, "tenantId"),
    assignedToMemberId: toObjectId(employeeMemberId, "employeeMemberId"),
    "approval.status": "PENDING",
  }).lean();
}
export async function createWorkGoal({ tenantId, actorId, payload, meta = {}, actorMembershipId }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    action: "create",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();
      try {
        let created;
        await session.withTransaction(async () => {
          const data = sanitizePayload(payload, actorId);

          // Block adding goals to a submitted/locked cycle for the owner
          await assertCycleEditableByOwner({
            tenantId,
            weekCycleId: data.weekCycleId,
            actorMembershipId,
            assignedToMemberId: data.assignedToMemberId ?? actorMembershipId,
            goalApprovalStatus: undefined,
          });

          await validateGoalPayload({ tenantId, payload: data, session });

          created = await WorkGoal.create(
            [{ ...data, tenantId: toObjectId(tenantId, "tenantId") }],
            { session }
          );

          await recomputeWeekCycleSummary({
            tenantId,
            weekCycleId: data.weekCycleId,
            session,
          });
        });

        const doc = created[0].toObject();

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "work_goal",
          entityId: doc._id,
          action: "create",
          after: doc,
          meta: buildMeta(meta, { success: true }),
        });

        await publishWsEvent({
          tenantId,
          event: "goal:assigned",
          payload: {
            tenantId,
            goalId: String(doc._id),
            assignedToMemberId: String(doc.assignedToMemberId),
            actorId,
          },
        });

        await notifyDepartmentHead({ tenantId, goal: doc, action: "create" });

        return doc;
      } finally {
        await session.endSession();
      }
    },
  });
}

export async function listWorkGoals({ tenantId, query = {} }) {
  return withService({
    tenantId,
    entityType: "work_goal",
    action: "list",
    meta: { query },
    execute: async () => {
      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

      const filter = { tenantId: toObjectId(tenantId, "tenantId") };

      if (query.weekCycleId) filter.weekCycleId = toObjectId(query.weekCycleId, "weekCycleId");
      if (query.departmentId) filter.departmentId = toObjectId(query.departmentId, "departmentId");
      if (query.assignedToMemberId) filter.assignedToMemberId = toObjectId(query.assignedToMemberId, "assignedToMemberId");
      if (query.status) filter.status = query.status;
      if (query.approvalStatus) filter["approval.status"] = query.approvalStatus;
      if (query.goalType) filter.goalType = query.goalType;
      if (query.category) filter.category = query.category;
      if (query.priority) filter.priority = query.priority;
      if (query.visibility) filter.visibility = query.visibility;
      if (query.search) {
        filter.$or = [
          { title: { $regex: query.search, $options: "i" } },
          { description: { $regex: query.search, $options: "i" } },
          { goalCode: { $regex: query.search, $options: "i" } },
        ];
      }

      const [docs, total] = await Promise.all([
        WorkGoal.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        WorkGoal.countDocuments(filter),
      ]);

      return { docs, total, page, limit, pages: Math.ceil(total / limit) };
    },
  });
}

export async function getWorkGoalById({ tenantId, id }) {
  return withService({
    tenantId,
    entityType: "work_goal",
    entityId: id,
    action: "get",
    execute: async () => {
      const doc = await WorkGoal.findOne({
        _id: toObjectId(id, "workGoalId"),
        tenantId: toObjectId(tenantId, "tenantId"),
      }).lean();

      if (!doc) throw ApiError.notFound("WorkGoal not found");
      return doc;
    },
  });
}

export async function updateWorkGoal({ tenantId, id, actorId, payload, meta = {}, actorMembershipId }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "update",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();
      try {
        let result;
        await session.withTransaction(async () => {
          const doc = await findGoalOrThrow({ tenantId, id, session });
          const before = doc.toObject();

          // Block goal owner from full edits when cycle is submitted
          await assertCycleEditableByOwner({
            tenantId,
            weekCycleId: doc.weekCycleId,
            actorMembershipId,
            assignedToMemberId: doc.assignedToMemberId,
            goalApprovalStatus: doc?.approval?.status,
          });

          const nextPayload = sanitizePayload(
            {
              ...before,
              ...payload,
              createdByManagerId: before.createdByManagerId,
              weekCycleId: payload.weekCycleId ?? before.weekCycleId,
            },
            actorId
          );

          await validateGoalPayload({
            tenantId,
            payload: nextPayload,
            session,
            currentId: id,
          });

          Object.assign(doc, nextPayload);
          await doc.save({ session });

          await recomputeWeekCycleSummary({
            tenantId,
            weekCycleId: doc.weekCycleId,
            session,
          });

          result = { before, after: doc.toObject() };
        });

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "work_goal",
          entityId: id,
          action: "update",
          before: result.before,
          after: result.after,
          meta: buildMeta(meta, { success: true }),
        });

        await notifyDepartmentHead({ tenantId, goal: result.after, action: "update" });
        // Notify the goal owner when a manager (non-owner) updates the goal
        await notifyGoalOwner({ tenantId, goal: result.after, actorId, changeType: "update" });

        return result.after;
      } finally {
        await session.endSession();
      }
    },
  });
}

export async function deleteWorkGoal({ tenantId, id, actorId, meta = {}, actorMembershipId }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "delete",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();
      try {
        let result;
        await session.withTransaction(async () => {
          const doc = await findGoalOrThrow({ tenantId, id, session });
          const before = doc.toObject();

          if (doc.approval?.status === "APPROVED") {
            throw ApiError.badRequest("Approved goals cannot be deleted");
          }

          // Block owner from deleting goals in a submitted/locked cycle
          await assertCycleEditableByOwner({
            tenantId,
            weekCycleId: doc.weekCycleId,
            actorMembershipId,
            assignedToMemberId: doc.assignedToMemberId,
            goalApprovalStatus: doc?.approval?.status,
          });

          const weekCycleId = doc.weekCycleId;
          // Save goal info before deletion for notification
          const goalSnapshot = doc.toObject();
          await doc.deleteOne({ session });

          await recomputeWeekCycleSummary({ tenantId, weekCycleId, session });

          result = { before, goalSnapshot };
        });

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "work_goal",
          entityId: id,
          action: "delete",
          before: result.before,
          meta: buildMeta(meta, { success: true }),
        });

        // Notify goal owner when a manager deletes their goal
        await notifyGoalOwner({ tenantId, goal: result.goalSnapshot, actorId, changeType: "delete" });

        return { success: true };
      } finally {
        await session.endSession();
      }
    },
  });
}

export async function submitWorkGoal({ tenantId, id, actorId, payload = {}, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "submit",
    meta,
    execute: async () => {
      const doc = await findGoalOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (payload.selfReportedPct !== undefined) {
        doc.progress.selfReportedPct = payload.selfReportedPct;
      }
      if (payload.remarks !== undefined) doc.remarks = payload.remarks;
      if (payload.blockers !== undefined) doc.blockers = payload.blockers;
      if (payload.status !== undefined) doc.status = payload.status;

      doc.approval.status = "PENDING";
      doc.updatedByManagerId = toObjectId(actorId, "actorId");

      await doc.save();

      await recomputeWeekCycleSummary({
        tenantId,
        weekCycleId: doc.weekCycleId,
      });

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "work_goal",
        entityId: id,
        action: "submit",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}

export async function approveWorkGoal({ tenantId, id, actorId, payload = {}, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "approve",
    meta,
    execute: async () => {
      const doc = await findGoalOrThrow({ tenantId, id });
      const before = doc.toObject();

      doc.approval.status = "APPROVED";
      doc.approval.approvedBy = toObjectId(actorId, "actorId");
      doc.approval.approvedAt = new Date();
      doc.approval.rejectionReason = null;

      if (payload.managerApprovedPct !== undefined) {
        doc.progress.managerApprovedPct = payload.managerApprovedPct;
      } else if (doc.progress.selfReportedPct !== undefined) {
        doc.progress.managerApprovedPct = doc.progress.selfReportedPct;
      }

      if (payload.managerRemarks !== undefined) {
        doc.managerRemarks = payload.managerRemarks;
      }

      doc.updatedByManagerId = toObjectId(actorId, "actorId");
      await doc.save();

      await recomputeWeekCycleSummary({
        tenantId,
        weekCycleId: doc.weekCycleId,
      });

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "work_goal",
        entityId: id,
        action: "approve",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}

export async function rejectWorkGoal({ tenantId, id, actorId, payload, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "reject",
    meta,
    execute: async () => {
      const doc = await findGoalOrThrow({ tenantId, id });
      const before = doc.toObject();

      doc.approval.status = "REJECTED";
      doc.approval.approvedBy = toObjectId(actorId, "actorId");
      doc.approval.approvedAt = new Date();
      doc.approval.rejectionReason = payload.rejectionReason;
      if (payload.managerRemarks !== undefined) {
        doc.managerRemarks = payload.managerRemarks;
      }
      doc.updatedByManagerId = toObjectId(actorId, "actorId");

      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "work_goal",
        entityId: id,
        action: "reject",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}

export async function listGoalsByDepartment({ tenantId, departmentId, query = {} }) {
  return listWorkGoals({
    tenantId,
    query: { ...query, departmentId },
  });
}

export async function updateWorkGoalStatus({ tenantId, id, actorId, status, reason, comment, meta = {} }) {
  const doc = await findGoalOrThrow({ tenantId, id });
  const before = doc.toObject();
  const previousPct = doc.progress?.managerApprovedPct ?? doc.progress?.selfReportedPct ?? 0;
  const previousStatus = doc.status;

  doc.status = status;
  if (status === "COMPLETED") {
    doc.progress.selfReportedPct = 100;
    doc.progress.managerApprovedPct = 100;
  }
  if (comment) {
    doc.managerRemarks = comment;
  }
  doc.updatedByManagerId = toObjectId(actorId, "actorId");
  await doc.save();

  await GoalProgressHistory.create({
    tenantId: toObjectId(tenantId, "tenantId"),
    goalId: doc._id,
    previousPct,
    newPct: doc.progress?.managerApprovedPct ?? doc.progress?.selfReportedPct ?? previousPct,
    previousStatus,
    newStatus: status,
    reason: reason ?? null,
    updatedByManagerId: toObjectId(actorId, "actorId"),
  });

  await safeRecordAudit({
    tenantId,
    actorId,
    entityType: "work_goal",
    entityId: id,
    action: "status_update",
    before,
    after: doc.toObject(),
    meta: buildMeta(meta, { success: true }),
  });

  // Notify the goal owner when a manager (non-owner) changes the status
  await notifyGoalOwner({ tenantId, goal: doc.toObject(), actorId, changeType: "status" });

  return doc.toObject();
}

export async function carryForwardWorkGoals({ tenantId, actorId, goalIds = [], targetWeekCycleId, meta = {} }) {
  const session = await mongoose.startSession();
  try {
    let docs = [];
    await session.withTransaction(async () => {
      await assertWeekCycleExists({ tenantId, weekCycleId: targetWeekCycleId, session });

      const goals = await WorkGoal.find({
        tenantId: toObjectId(tenantId, "tenantId"),
        _id: { $in: goalIds.map((id) => toObjectId(id, "workGoalId")) },
      }).session(session);

      docs = [];
      for (const goal of goals) {
        const raw = goal.toObject();
        delete raw._id;
        delete raw.createdAt;
        delete raw.updatedAt;

        const clone = await WorkGoal.create(
          [{
            ...raw,
            tenantId: toObjectId(tenantId, "tenantId"),
            weekCycleId: toObjectId(targetWeekCycleId, "weekCycleId"),
            originGoalId: goal._id,
            isCarriedForward: true,
            status: "CARRIED_FORWARD",
            approval: { status: "PENDING", approvedBy: null, approvedAt: null, rejectionReason: null },
          }],
          { session }
        );
        docs.push(clone[0].toObject());
      }
    });

    await safeRecordAudit({
      tenantId,
      actorId,
      entityType: "work_goal",
      entityId: null,
      action: "carry_forward",
      after: { goalIds, targetWeekCycleId, count: docs.length },
      meta: buildMeta(meta, { success: true }),
    });

    return { count: docs.length, docs };
  } finally {
    await session.endSession();
  }
}

export async function getWorkGoalHistory({ tenantId, id }) {
  await findGoalOrThrow({ tenantId, id });
  return GoalProgressHistory.find({
    tenantId: toObjectId(tenantId, "tenantId"),
    goalId: toObjectId(id, "workGoalId"),
  })
    .sort({ updatedAt: -1 })
    .lean();
}
