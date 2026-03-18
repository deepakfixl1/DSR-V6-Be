import mongoose from "mongoose";
import WeekCycle from "#db/models/WeekCycle.model.js";
import WorkGoal from "#db/models/WorkGoal.model.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { logger } from "#api/utils/logger.js";

const toObjectId = (value, field = "id") => {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${field}`);
  }
  return new mongoose.Types.ObjectId(String(value));
};

const buildMeta = (meta = {}, extra = {}) => ({
  module: "week-cycle",
  timestamp: new Date().toISOString(),
  ...meta,
  ...extra,
});

const safeRecordAudit = async (payload) => {
  try {
    await recordAudit(payload);
  } catch (error) {
    logger.error({ err: error, payload }, "Failed to record week-cycle audit");
  }
};

const mapMongoError = (error) => {
  if (error?.code === 11000) {
    return ApiError.conflict("WeekCycle already exists for this employee and week");
  }
  return error;
};

const withService = async ({ tenantId, actorId, entityType, entityId, action, meta, execute }) => {
  try {
    logger.info({ tenantId, actorId, entityType, entityId, action }, "week-cycle service started");
    const result = await execute();
    logger.info({ tenantId, actorId, entityType, entityId, action }, "week-cycle service completed");
    return result;
  } catch (rawError) {
    const error = mapMongoError(rawError);
    logger.error({ tenantId, actorId, entityType, entityId, action, err: error }, "week-cycle service failed");

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

const findWeekCycleOrThrow = async ({ tenantId, id, session = null }) => {
  const doc = await WeekCycle.findOne({
    _id: toObjectId(id, "weekCycleId"),
    tenantId: toObjectId(tenantId, "tenantId"),
  }).session(session);

  if (!doc) throw ApiError.notFound("WeekCycle not found");
  return doc;
};

const recomputeSummary = async ({ tenantId, weekCycleId, session = null }) => {
  const goals = await WorkGoal.find({
    tenantId: toObjectId(tenantId, "tenantId"),
    weekCycleId: toObjectId(weekCycleId, "weekCycleId"),
  }).session(session).lean();

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
  const blockedGoals = goals.filter((g) => g.status === "BLOCKED").length;
  const carriedForwardGoals = goals.filter((g) => g.isCarriedForward).length;
  const completionPct = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  await WeekCycle.updateOne(
    { _id: toObjectId(weekCycleId, "weekCycleId"), tenantId: toObjectId(tenantId, "tenantId") },
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

export async function createWeekCycle({ tenantId, actorId, payload, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    action: "create",
    meta,
    execute: async () => {
      const doc = await WeekCycle.create({
        ...payload,
        tenantId: toObjectId(tenantId, "tenantId"),
        employeeMemberId: toObjectId(payload.employeeMemberId, "employeeMemberId"),
      });

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
        entityId: doc._id,
        action: "create",
        after: doc.toObject(),
        meta: buildMeta(meta, { success: true }),
      });

      return doc.toObject();
    },
  });
}

export async function listWeekCycles({ tenantId, query = {} }) {
  return withService({
    tenantId,
    entityType: "week_cycle",
    action: "list",
    meta: { query },
    execute: async () => {
      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

      const filter = { tenantId: toObjectId(tenantId, "tenantId") };

      if (query.employeeMemberId) filter.employeeMemberId = toObjectId(query.employeeMemberId, "employeeMemberId");
      if (query.status) filter.status = query.status;
      if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;

      const [docs, total] = await Promise.all([
        WeekCycle.find(filter)
          .sort({ weekStartDate: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        WeekCycle.countDocuments(filter),
      ]);

      return { docs, total, page, limit, pages: Math.ceil(total / limit) };
    },
  });
}

export async function getWeekCycleById({ tenantId, id }) {
  return withService({
    tenantId,
    entityType: "week_cycle",
    entityId: id,
    action: "get",
    execute: async () => {
      const doc = await WeekCycle.findOne({
        _id: toObjectId(id, "weekCycleId"),
        tenantId: toObjectId(tenantId, "tenantId"),
      }).lean();

      if (!doc) throw ApiError.notFound("WeekCycle not found");
      return doc;
    },
  });
}

export async function updateWeekCycle({ tenantId, id, actorId, payload, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "update",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (["APPROVED", "LOCKED"].includes(doc.status)) {
        throw ApiError.badRequest("Approved or locked WeekCycle cannot be updated");
      }

      Object.assign(doc, payload);
      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
        entityId: id,
        action: "update",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}

export async function deleteWeekCycle({ tenantId, id, actorId, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "delete",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();
      try {
        let before;
        await session.withTransaction(async () => {
          const doc = await findWeekCycleOrThrow({ tenantId, id, session });
          before = doc.toObject();

          if (["SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"].includes(doc.status)) {
            throw ApiError.badRequest("Submitted/reviewed/approved/locked WeekCycle cannot be deleted");
          }

          const goalCount = await WorkGoal.countDocuments({
            tenantId: toObjectId(tenantId, "tenantId"),
            weekCycleId: doc._id,
          }).session(session);

          if (goalCount > 0) {
            throw ApiError.badRequest("Cannot delete WeekCycle with existing goals");
          }

          await doc.deleteOne({ session });
        });

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "week_cycle",
          entityId: id,
          action: "delete",
          before,
          meta: buildMeta(meta, { success: true }),
        });

        return { success: true };
      } finally {
        await session.endSession();
      }
    },
  });
}

export async function submitWeekCycle({ tenantId, id, actorId, payload = {}, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "submit",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (doc.status !== "OPEN") {
        throw ApiError.badRequest("Only OPEN WeekCycle can be submitted");
      }

      await recomputeSummary({ tenantId, weekCycleId: doc._id });

      doc.status = "SUBMITTED";
      doc.approvalStatus = "PENDING";
      doc.submittedAt = new Date();
      doc.submittedBy = toObjectId(actorId, "actorId");

      if (payload.employeeRemarks !== undefined) {
        doc.employeeRemarks = payload.employeeRemarks;
      }

      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
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

export async function reviewWeekCycle({ tenantId, id, actorId, payload = {}, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "review",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (!["SUBMITTED", "UNDER_REVIEW"].includes(doc.status)) {
        throw ApiError.badRequest("Only SUBMITTED or UNDER_REVIEW WeekCycle can be reviewed");
      }

      doc.status = "UNDER_REVIEW";
      doc.reviewedAt = new Date();
      doc.reviewedBy = toObjectId(actorId, "actorId");
      if (payload.managerRemarks !== undefined) {
        doc.managerRemarks = payload.managerRemarks;
      }

      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
        entityId: id,
        action: "review",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}

export async function approveWeekCycle({ tenantId, id, actorId, payload = {}, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "approve",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (!["SUBMITTED", "UNDER_REVIEW"].includes(doc.status)) {
        throw ApiError.badRequest("Only SUBMITTED or UNDER_REVIEW WeekCycle can be approved");
      }

      await recomputeSummary({ tenantId, weekCycleId: doc._id });

      doc.status = "APPROVED";
      doc.approvalStatus = "APPROVED";
      doc.reviewedAt = new Date();
      doc.reviewedBy = toObjectId(actorId, "actorId");
      if (payload.managerRemarks !== undefined) {
        doc.managerRemarks = payload.managerRemarks;
      }

      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
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

export async function rejectWeekCycle({ tenantId, id, actorId, payload, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "reject",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (!["SUBMITTED", "UNDER_REVIEW"].includes(doc.status)) {
        throw ApiError.badRequest("Only SUBMITTED or UNDER_REVIEW WeekCycle can be rejected");
      }

      doc.status = "OPEN";
      doc.approvalStatus = "REJECTED";
      doc.reviewedAt = new Date();
      doc.reviewedBy = toObjectId(actorId, "actorId");
      doc.managerRemarks = payload.managerRemarks;

      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
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

export async function unlockWeekCycle({ tenantId, id, actorId, meta = {} }) {
  return withService({
    tenantId,
    actorId,
    entityType: "week_cycle",
    entityId: id,
    action: "unlock",
    meta,
    execute: async () => {
      const doc = await findWeekCycleOrThrow({ tenantId, id });
      const before = doc.toObject();

      if (doc.status === "OPEN") {
        return doc.toObject(); // already open, no-op
      }

      doc.status = "OPEN";
      doc.approvalStatus = "PENDING";
      await doc.save();

      const after = doc.toObject();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "week_cycle",
        entityId: id,
        action: "unlock",
        before,
        after,
        meta: buildMeta(meta, { success: true }),
      });

      return after;
    },
  });
}