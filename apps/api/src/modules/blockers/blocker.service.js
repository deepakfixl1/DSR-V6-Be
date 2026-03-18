import mongoose from "mongoose";
import Blocker from "#db/models/Blocker.model.js";
import { TenantMembership } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";
import { emitEvent } from "#api/modules/events/eventBus.js";
import { publishWsEvent } from "#api/modules/events/ws.events.js";
import { createNotification } from "#api/modules/notification/notification.service.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export async function createBlocker({ tenantId, actorId, payload, meta }) {
  const dueAt = payload.SLA?.dueAt
    ? new Date(payload.SLA.dueAt)
    : payload.SLA?.expectedResolutionHours
      ? new Date(Date.now() + payload.SLA.expectedResolutionHours * 3600 * 1000)
      : null;
  const blocker = await Blocker.create({
    tenantId: toObjectId(tenantId),
    reporterId: toObjectId(actorId),
    assigneeId: payload.assigneeId ? toObjectId(payload.assigneeId) : null,
    teamId: payload.teamId ? toObjectId(payload.teamId) : null,
    departmentId: payload.departmentId ? toObjectId(payload.departmentId) : null,
    type: payload.type,
    severity: payload.severity ?? "medium",
    status: payload.status ?? "open",
    title: payload.title,
    description: payload.description ?? null,
    relatedTaskIds: payload.relatedTaskIds?.map(toObjectId) ?? [],
    relatedGoalIds: payload.relatedGoalIds?.map(toObjectId) ?? [],
    relatedReportId: payload.relatedReportId ? toObjectId(payload.relatedReportId) : null,
    linkedBlockerIds: payload.linkedBlockerIds?.map(toObjectId) ?? [],
    priority: payload.priority ?? payload.severity ?? "medium",
    watchers: payload.watchers?.map(toObjectId) ?? [],
    escalation: { level: 0, escalatedTo: null, escalatedAt: null },
    SLA: {
      expectedResolutionHours: payload.SLA?.expectedResolutionHours ?? null,
      dueAt,
      breached: false,
    },
    metadata: payload.metadata ?? {},
  });

  await recordAudit({
    tenantId,
    actorId,
    entityType: "blocker",
    entityId: blocker._id,
    action: "create",
    after: blocker.toObject(),
    meta,
  });

  emitEvent("blocker.created", { tenantId, blockerId: blocker._id });

  // Notify the assignee if one was set
  try {
    if (blocker.assigneeId) {
      const assignee = await TenantMembership.findOne({
        _id: blocker.assigneeId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (assignee?.userId) {
        await createNotification({
          userId: assignee.userId,
          memberId: assignee._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "BLOCKER_ASSIGNED",
          title: "Blocker assigned to you",
          body: `You have been assigned a ${blocker.severity} severity blocker: "${blocker.title}"`,
          link: `/blockers/${blocker._id}`,
          priority: blocker.severity === "critical" ? "critical" : blocker.severity === "high" ? "high" : "normal",
          payload: { blockerId: String(blocker._id), severity: blocker.severity },
        });
      }
    }
  } catch (_) { /* non-blocking */ }

  return blocker.toObject();
}

export async function listBlockers({ tenantId, query }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const filter = { tenantId: toObjectId(tenantId) };
  if (query.status) filter.status = query.status;
  if (query.severity) filter.severity = query.severity;
  if (query.assigneeId) filter.assigneeId = toObjectId(query.assigneeId);
  if (query.departmentId) filter.departmentId = toObjectId(query.departmentId);
  if (query.reporterId) filter.reporterId = toObjectId(query.reporterId);
  if (query.noDepartment === "true") filter.departmentId = null;

  const [docs, total] = await Promise.all([
    Blocker.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Blocker.countDocuments(filter),
  ]);

  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getBlockerById({ tenantId, id }) {
  const blocker = await Blocker.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!blocker) throw ApiError.notFound("Blocker not found");
  return blocker;
}

export async function updateBlocker({ tenantId, id, payload, actorId, meta }) {
  const blocker = await Blocker.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!blocker) throw ApiError.notFound("Blocker not found");

  const before = blocker.toObject();
  if (payload.assigneeId !== undefined) {
    blocker.assigneeId = payload.assigneeId ? toObjectId(payload.assigneeId) : null;
  }
  if (payload.teamId !== undefined) blocker.teamId = payload.teamId ? toObjectId(payload.teamId) : null;
  if (payload.departmentId !== undefined) {
    blocker.departmentId = payload.departmentId ? toObjectId(payload.departmentId) : null;
  }
  if (payload.type !== undefined) blocker.type = payload.type;
  if (payload.severity !== undefined) blocker.severity = payload.severity;
  if (payload.status !== undefined) blocker.status = payload.status;
  if (payload.title !== undefined) blocker.title = payload.title;
  if (payload.description !== undefined) blocker.description = payload.description;
  if (payload.relatedTaskIds !== undefined) {
    blocker.relatedTaskIds = payload.relatedTaskIds?.map(toObjectId) ?? [];
  }
  if (payload.relatedGoalIds !== undefined) {
    blocker.relatedGoalIds = payload.relatedGoalIds?.map(toObjectId) ?? [];
  }
  if (payload.relatedReportId !== undefined) {
    blocker.relatedReportId = payload.relatedReportId ? toObjectId(payload.relatedReportId) : null;
  }
  if (payload.linkedBlockerIds !== undefined) {
    blocker.linkedBlockerIds = payload.linkedBlockerIds?.map(toObjectId) ?? [];
  }
  if (payload.priority !== undefined) blocker.priority = payload.priority;
  if (payload.watchers !== undefined) blocker.watchers = payload.watchers?.map(toObjectId) ?? [];
  if (payload.SLA !== undefined) {
    blocker.SLA = {
      expectedResolutionHours: payload.SLA.expectedResolutionHours ?? blocker.SLA?.expectedResolutionHours ?? null,
      dueAt: payload.SLA.dueAt ?? blocker.SLA?.dueAt ?? null,
      breached: payload.SLA.breached ?? blocker.SLA?.breached ?? false,
    };
  }
  if (payload.metadata !== undefined) blocker.metadata = payload.metadata;

  const assigneeChanged = payload.assigneeId !== undefined &&
    String(before.assigneeId ?? "") !== String(blocker.assigneeId ?? "");

  await blocker.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "blocker",
    entityId: blocker._id,
    action: "update",
    before,
    after: blocker.toObject(),
    meta,
  });

  // Notify new assignee if they were just assigned
  if (assigneeChanged && blocker.assigneeId) {
    try {
      const assignee = await TenantMembership.findOne({
        _id: blocker.assigneeId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (assignee?.userId) {
        await createNotification({
          userId: assignee.userId,
          memberId: assignee._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "BLOCKER_ASSIGNED",
          title: "Blocker assigned to you",
          body: `You have been assigned a ${blocker.severity} severity blocker: "${blocker.title}"`,
          link: `/blockers/${blocker._id}`,
          priority: blocker.severity === "critical" ? "critical" : blocker.severity === "high" ? "high" : "normal",
          payload: { blockerId: String(blocker._id), severity: blocker.severity },
        });
      }
    } catch (_) { /* non-blocking */ }
  }

  return blocker.toObject();
}

export async function escalateBlocker({ tenantId, id, escalatedTo, actorId, meta }) {
  const blocker = await Blocker.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!blocker) throw ApiError.notFound("Blocker not found");

  const before = blocker.toObject();
  blocker.status = "escalated";
  blocker.escalation = {
    level: (blocker.escalation?.level ?? 0) + 1,
    escalatedTo: escalatedTo ? toObjectId(escalatedTo) : blocker.escalation?.escalatedTo ?? null,
    escalatedAt: new Date(),
  };
  await blocker.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "blocker",
    entityId: blocker._id,
    action: "escalate",
    before,
    after: blocker.toObject(),
    meta,
  });

  emitEvent("blocker.escalated", { tenantId, blockerId: blocker._id });
  await publishWsEvent({
    tenantId,
    event: "blocker:escalated",
    payload: { tenantId, blockerId: String(blocker._id), actorId, escalation: blocker.escalation },
  });

  // Notify the escalation target and the original reporter
  try {
    const targetId = blocker.escalation?.escalatedTo;
    const notifications = [];
    if (targetId) {
      const target = await TenantMembership.findOne({
        _id: targetId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (target?.userId) {
        notifications.push(createNotification({
          userId: target.userId,
          memberId: target._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "BLOCKER_ESCALATED",
          title: "Blocker escalated to you",
          body: `A ${blocker.severity} severity blocker has been escalated to you: "${blocker.title}"`,
          link: `/blockers/${blocker._id}`,
          priority: "high",
          payload: { blockerId: String(blocker._id), level: blocker.escalation?.level },
        }).catch(() => {}));
      }
    }
    // Notify reporter that their blocker was escalated
    if (blocker.reporterId && String(blocker.reporterId) !== String(actorId)) {
      const reporter = await TenantMembership.findOne({
        userId: blocker.reporterId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (reporter?.userId) {
        notifications.push(createNotification({
          userId: reporter.userId,
          memberId: reporter._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "BLOCKER_ESCALATED",
          title: "Your blocker has been escalated",
          body: `Your blocker "${blocker.title}" has been escalated (level ${blocker.escalation?.level}).`,
          link: `/blockers/${blocker._id}`,
          priority: "normal",
          payload: { blockerId: String(blocker._id), level: blocker.escalation?.level },
        }).catch(() => {}));
      }
    }
    await Promise.all(notifications);
  } catch (_) { /* non-blocking */ }

  return blocker.toObject();
}

export async function resolveBlocker({ tenantId, id, resolutionNote, actorId, meta }) {
  const blocker = await Blocker.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!blocker) throw ApiError.notFound("Blocker not found");

  const before = blocker.toObject();
  blocker.status = "resolved";
  blocker.resolvedAt = new Date();
  blocker.resolutionNote = resolutionNote ?? null;
  await blocker.save();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "blocker",
    entityId: blocker._id,
    action: "resolve",
    before,
    after: blocker.toObject(),
    meta,
  });

  emitEvent("blocker.resolved", { tenantId, blockerId: blocker._id });

  // Notify the reporter that their blocker has been resolved
  try {
    if (blocker.reporterId && String(blocker.reporterId) !== String(actorId)) {
      const reporter = await TenantMembership.findOne({
        userId: blocker.reporterId,
        tenantId: toObjectId(tenantId),
        status: "active",
      }).lean();
      if (reporter?.userId) {
        await createNotification({
          userId: reporter.userId,
          memberId: reporter._id,
          tenantId: toObjectId(tenantId),
          scope: "user",
          type: "BLOCKER_RESOLVED",
          title: "Blocker resolved",
          body: `Your blocker "${blocker.title}" has been resolved.${resolutionNote ? ` Note: ${resolutionNote}` : ""}`,
          link: `/blockers/${blocker._id}`,
          priority: "normal",
          payload: { blockerId: String(blocker._id), resolutionNote: resolutionNote ?? null },
        });
      }
    }
  } catch (_) { /* non-blocking */ }

  return blocker.toObject();
}

export async function closeBlocker({ tenantId, id, actorId, meta }) {
  return resolveBlocker({ tenantId, id, resolutionNote: "Closed", actorId, meta }).then(async (blocker) => {
    const doc = await Blocker.findOne({
      _id: toObjectId(id),
      tenantId: toObjectId(tenantId),
    });
    doc.status = "closed";
    await doc.save();
    return doc.toObject();
  });
}

export async function deleteBlocker({ tenantId, id, actorId, meta }) {
  const blocker = await Blocker.findOne({
    _id: toObjectId(id),
    tenantId: toObjectId(tenantId),
  });
  if (!blocker) throw ApiError.notFound("Blocker not found");

  const before = blocker.toObject();
  await blocker.deleteOne();

  await recordAudit({
    tenantId,
    actorId,
    entityType: "blocker",
    entityId: blocker._id,
    action: "delete",
    before,
    after: null,
    meta,
  });

  return { success: true };
}

export async function getBlockerStats({ tenantId, departmentId, reporterId }) {
  const tenantObjectId = toObjectId(tenantId);
  const baseFilter = { tenantId: tenantObjectId };
  if (departmentId) baseFilter.departmentId = toObjectId(departmentId);
  if (reporterId) baseFilter.reporterId = toObjectId(reporterId);

  const [statusCounts, breached, openCount] = await Promise.all([
    Blocker.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Blocker.countDocuments({ ...baseFilter, "SLA.breached": true }),
    Blocker.countDocuments({ ...baseFilter, status: { $in: ["open", "in_progress", "escalated"] } }),
  ]);

  return {
    totals: Object.fromEntries(statusCounts.map((item) => [item._id, item.count])),
    breached,
    openCount,
  };
}

export async function listSlaBreachedBlockers({ tenantId, departmentId, reporterId }) {
  const filter = {
    tenantId: toObjectId(tenantId),
    "SLA.breached": true,
  };
  if (departmentId) filter.departmentId = toObjectId(departmentId);
  if (reporterId) filter.reporterId = toObjectId(reporterId);

  return Blocker.find(filter)
    .sort({ "SLA.dueAt": 1, createdAt: -1 })
    .lean();
}
