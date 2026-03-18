import mongoose from "mongoose";
import { Blocker, Notification, TenantMembership, WorkGoal, WorkReport } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export async function getDashboardStats({ tenantId, actorId, departmentId, employeeMemberId }) {
  const tenantObjectId = toObjectId(tenantId);
  const membership = await TenantMembership.findOne({
    tenantId: tenantObjectId,
    userId: toObjectId(actorId),
    status: "active",
  }).lean();

  // Build base filters — optionally scoped to department or single employee
  const reportFilter = { tenantId: tenantObjectId };
  const goalFilter = { tenantId: tenantObjectId };
  const blockerFilter = { tenantId: tenantObjectId, status: { $in: ["open", "in_progress", "escalated"] } };

  if (departmentId) {
    reportFilter.departmentId = toObjectId(departmentId);
    goalFilter.departmentId = toObjectId(departmentId);
    blockerFilter.departmentId = toObjectId(departmentId);
  }
  if (employeeMemberId) {
    reportFilter.employeeMemberId = toObjectId(employeeMemberId);
    goalFilter.assignedToMemberId = toObjectId(employeeMemberId);
    blockerFilter.reporterId = toObjectId(employeeMemberId);
  }

  const [reports, goals, blockers, unreadNotifications] = await Promise.all([
    WorkReport.countDocuments(reportFilter),
    WorkGoal.countDocuments(goalFilter),
    Blocker.countDocuments(blockerFilter),
    Notification.countDocuments({ tenantId: tenantObjectId, readAt: null, $or: [{ userId: toObjectId(actorId) }, { userId: null }] }),
  ]);

  return {
    reports,
    goals,
    blockers,
    unreadNotifications,
    membershipId: membership?._id ?? null,
  };
}

export async function getTeamStats({ tenantId, actorId, departmentId }) {
  const tenantObjectId = toObjectId(tenantId);
  const managerMembership = await TenantMembership.findOne({
    tenantId: tenantObjectId,
    userId: toObjectId(actorId),
    status: "active",
  }).lean();

  const teamFilter = {
    tenantId: tenantObjectId,
    managerId: managerMembership?._id ?? null,
    status: "active",
  };
  if (departmentId) {
    teamFilter.departmentId = toObjectId(departmentId);
  }

  const teamMembers = await TenantMembership.find(teamFilter)
    .select("_id userId departmentId").lean();

  const memberIds = teamMembers.map((member) => member._id);

  const [reportBreakdown, goalBreakdown, blockerBreakdown] = await Promise.all([
    WorkReport.aggregate([
      { $match: { tenantId: tenantObjectId, employeeMemberId: { $in: memberIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    WorkGoal.aggregate([
      { $match: { tenantId: tenantObjectId, assignedToMemberId: { $in: memberIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Blocker.aggregate([
      { $match: { tenantId: tenantObjectId, assigneeId: { $in: teamMembers.map((member) => member.userId) } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    teamSize: teamMembers.length,
    reports: Object.fromEntries(reportBreakdown.map((item) => [item._id, item.count])),
    goals: Object.fromEntries(goalBreakdown.map((item) => [item._id, item.count])),
    blockers: Object.fromEntries(blockerBreakdown.map((item) => [item._id, item.count])),
  };
}

export async function getActivityFeed({ tenantId, actorId, limit = 20, departmentId, employeeMemberId }) {
  const tenantObjectId = toObjectId(tenantId);
  const safeLimit = Math.min(50, Math.max(1, Number(limit)));

  // Build filters — scoped when provided
  const reportFilter = { tenantId: tenantObjectId };
  const goalFilter = { tenantId: tenantObjectId };
  const blockerFilter = { tenantId: tenantObjectId };

  if (departmentId) {
    reportFilter.departmentId = toObjectId(departmentId);
    goalFilter.departmentId = toObjectId(departmentId);
    blockerFilter.departmentId = toObjectId(departmentId);
  }
  if (employeeMemberId) {
    reportFilter.employeeMemberId = toObjectId(employeeMemberId);
    goalFilter.assignedToMemberId = toObjectId(employeeMemberId);
    blockerFilter.reporterId = toObjectId(employeeMemberId);
  }

  const [reports, goals, blockers, notifications] = await Promise.all([
    WorkReport.find(reportFilter).sort({ updatedAt: -1 }).limit(safeLimit).lean(),
    WorkGoal.find(goalFilter).sort({ updatedAt: -1 }).limit(safeLimit).lean(),
    Blocker.find(blockerFilter).sort({ updatedAt: -1 }).limit(safeLimit).lean(),
    Notification.find({ tenantId: tenantObjectId, $or: [{ userId: toObjectId(actorId) }, { userId: null }] }).sort({ createdAt: -1 }).limit(safeLimit).lean(),
  ]);

  return [...reports.map((item) => ({ type: "report", at: item.updatedAt, data: item })),
    ...goals.map((item) => ({ type: "goal", at: item.updatedAt, data: item })),
    ...blockers.map((item) => ({ type: "blocker", at: item.updatedAt, data: item })),
    ...notifications.map((item) => ({ type: "notification", at: item.createdAt, data: item }))]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, safeLimit);
}
