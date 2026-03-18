import mongoose from "mongoose";
import { Blocker, TenantMembership, WorkGoal, WorkReport } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const average = (items = []) => (items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0);

export async function getEmployeeScorecard({ tenantId, memberId }) {
  const tenantObjectId = toObjectId(tenantId);
  const memberObjectId = toObjectId(memberId);
  const [reports, goals, blockers] = await Promise.all([
    WorkReport.find({ tenantId: tenantObjectId, employeeMemberId: memberObjectId }).lean(),
    WorkGoal.find({ tenantId: tenantObjectId, assignedToMemberId: memberObjectId }).lean(),
    Blocker.find({ tenantId: tenantObjectId, assigneeId: memberObjectId }).lean(),
  ]);

  const submissionScore = average(reports.map((report) => report.isLate ? 40 : 100));
  const goalScore = average(goals.map((goal) => goal.progress?.managerApprovedPct ?? goal.progress?.selfReportedPct ?? 0));
  const blockerPenalty = blockers.filter((item) => item.status !== "resolved" && item.status !== "closed").length * 5;

  return {
    reportsSubmitted: reports.length,
    goalsOwned: goals.length,
    blockerLoad: blockers.length,
    submissionScore,
    goalScore,
    efficiencyScore: Math.max(0, Math.round(((submissionScore + goalScore) / 2) - blockerPenalty)),
  };
}

export async function getTeamAnalytics({ tenantId, managerId }) {
  const members = await TenantMembership.find({
    tenantId: toObjectId(tenantId),
    managerId: toObjectId(managerId),
    status: "active",
  }).lean();

  const scorecards = await Promise.all(
    members.map((member) => getEmployeeScorecard({ tenantId, memberId: member._id }))
  );

  return {
    teamSize: members.length,
    averageEfficiencyScore: Math.round(average(scorecards.map((item) => item.efficiencyScore))),
    scorecards,
  };
}

export async function getDepartmentAnalytics({ tenantId, deptId }) {
  const members = await TenantMembership.find({
    tenantId: toObjectId(tenantId),
    departmentId: toObjectId(deptId),
    status: "active",
  }).lean();

  const scorecards = await Promise.all(
    members.map((member) => getEmployeeScorecard({ tenantId, memberId: member._id }))
  );

  return {
    memberCount: members.length,
    averageEfficiencyScore: Math.round(average(scorecards.map((item) => item.efficiencyScore))),
    members: members.map((member, index) => ({ memberId: member._id, scorecard: scorecards[index] })),
  };
}

export async function getReportScore({ tenantId, id }) {
  const report = await WorkReport.findOne({ tenantId: toObjectId(tenantId), _id: toObjectId(id) }).lean();
  if (!report) return null;

  return {
    reportId: report._id,
    efficiencyScore: report.efficiencyScore ?? (report.isLate ? 55 : 85),
    qualityScore: report.qualityScore ?? (report.status === "APPROVED" ? 90 : 65),
    status: report.status,
  };
}

export async function getEmployeeScoring({ tenantId, memberId }) {
  const reports = await WorkReport.find({
    tenantId: toObjectId(tenantId),
    employeeMemberId: toObjectId(memberId),
  }).sort({ createdAt: -1 }).limit(20).lean();

  return {
    memberId,
    averageEfficiencyScore: Math.round(average(reports.map((report) => report.efficiencyScore ?? (report.isLate ? 55 : 85)))),
    averageQualityScore: Math.round(average(reports.map((report) => report.qualityScore ?? (report.status === "APPROVED" ? 90 : 65)))),
    reports,
  };
}

export async function getLateSubmissions({ tenantId, departmentId, employeeMemberId }) {
  const filter = { tenantId: toObjectId(tenantId), isLate: true };
  if (departmentId) filter.departmentId = toObjectId(departmentId);
  if (employeeMemberId) filter.employeeMemberId = toObjectId(employeeMemberId);
  return WorkReport.find(filter).sort({ submittedAt: -1 }).lean();
}

export async function getWeeklyTrends({ tenantId, departmentId, employeeMemberId }) {
  const matchFilter = { tenantId: toObjectId(tenantId) };
  if (departmentId) matchFilter.departmentId = toObjectId(departmentId);
  if (employeeMemberId) matchFilter.employeeMemberId = toObjectId(employeeMemberId);

  return WorkReport.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%U", date: "$createdAt" } },
        reports: { $sum: 1 },
        lateReports: { $sum: { $cond: ["$isLate", 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}
