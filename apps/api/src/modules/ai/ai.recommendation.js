import mongoose from "mongoose";
import Task from "#db/models/Task.model.js";
import TenantMembership from "#db/models/TenantMembershipSchema.model.js";
import AIRecommendation from "#db/models/AIRecommendation.model.js";
import { logger } from "#api/utils/logger.js";

const priorityScoreMap = {
  critical: 1,
  high: 0.8,
  medium: 0.5,
  low: 0.2
};

const riskScoreMap = {
  critical: 1,
  high: 0.8,
  medium: 0.5,
  low: 0.2
};

export function calculateTaskScore(task, workloadScore = 0.5) {
  const priorityScore = priorityScoreMap[task.priority] ?? 0.5;
  const now = new Date();
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  let deadlineScore = 0.1;
  let overdueScore = 0;

  if (dueAt) {
    const diffDays = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) {
      deadlineScore = 1;
      overdueScore = 1;
    } else if (diffDays <= 1) {
      deadlineScore = 0.9;
    } else if (diffDays <= 3) {
      deadlineScore = 0.7;
    } else if (diffDays <= 7) {
      deadlineScore = 0.5;
    } else {
      deadlineScore = 0.2;
    }
  }

  const riskLevel = task?.metadata?.riskLevel || "low";
  const riskScore = riskScoreMap[riskLevel] ?? 0.2;
  const vipScore = task?.metadata?.vip === true ? 1 : 0;

  const weighted =
    priorityScore * 0.3 +
    deadlineScore * 0.25 +
    workloadScore * 0.15 +
    riskScore * 0.15 +
    vipScore * 0.1 +
    overdueScore * 0.05;

  return Math.round(weighted * 100);
}

const computeWorkloadScore = (taskCount, average) => {
  if (!average || average <= 0) return 0.5;
  const ratio = taskCount / average;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 0.7;
  if (ratio <= 1.5) return 0.4;
  return 0.2;
};

export async function recommendFocusForUser({ tenantId, userId, limit = 5 }) {
  const membership = await TenantMembership.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId: new mongoose.Types.ObjectId(userId),
    status: "active"
  }).lean();

  if (!membership) {
    return [];
  }

  const tasks = await Task.find({
    tenantId,
    assigneeId: membership._id,
    status: { $in: ["open", "in_progress"] }
  }).lean();

  const allOpenCounts = await Task.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ["open", "in_progress"] } } },
    { $group: { _id: "$assigneeId", count: { $sum: 1 } } }
  ]);
  const avgWorkload =
    allOpenCounts.length > 0
      ? allOpenCounts.reduce((sum, row) => sum + row.count, 0) / allOpenCounts.length
      : 0;

  const workloadScore = computeWorkloadScore(tasks.length, avgWorkload);

  const scored = tasks.map((task) => ({
    task,
    score: calculateTaskScore(task, workloadScore)
  }));
  scored.sort((a, b) => b.score - a.score);

  const recommendations = scored.slice(0, limit);

  for (const rec of recommendations) {
    await AIRecommendation.create({
      tenantId,
      userId,
      targetType: "user",
      targetId: new mongoose.Types.ObjectId(userId),
      type: "task-focus",
      priority: rec.task.priority || "medium",
      suggestedAction: `Focus on task: ${rec.task.title}`,
      reason: `Score ${rec.score}/100 based on priority, deadline, workload, and risk`,
      recommendation: {
        taskId: rec.task._id,
        score: rec.score
      },
      confidence: Math.min(1, rec.score / 100),
      tokensUsed: 0,
      metadata: { taskId: rec.task._id }
    });
  }

  logger.info({ tenantId, userId, count: recommendations.length }, "Task focus recommendations generated");

  return recommendations;
}

export async function rebalanceTeamWorkload({ tenantId, teamId, userId }) {
  const members = await TenantMembership.find({
    tenantId,
    teamId: new mongoose.Types.ObjectId(teamId),
    status: "active"
  }).lean();

  if (!members.length) return [];

  const memberIds = members.map((m) => m._id);
  const workloads = await Task.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), assigneeId: { $in: memberIds }, status: { $in: ["open", "in_progress"] } } },
    { $group: { _id: "$assigneeId", count: { $sum: 1 } } }
  ]);

  const workloadMap = new Map();
  for (const member of members) {
    workloadMap.set(String(member._id), 0);
  }
  workloads.forEach((row) => workloadMap.set(String(row._id), row.count));

  const sorted = [...workloadMap.entries()].sort((a, b) => b[1] - a[1]);
  const heavy = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 3)));
  const light = sorted.slice(-Math.max(1, Math.floor(sorted.length / 3)));

  const suggestions = [];
  for (const [heavyId, heavyCount] of heavy) {
    for (const [lightId, lightCount] of light) {
      if (heavyCount - lightCount <= 1) continue;
      suggestions.push({ from: heavyId, to: lightId, delta: heavyCount - lightCount });
    }
  }

  const fallbackUserId = userId || members[0]?.userId;
  for (const suggestion of suggestions) {
    await AIRecommendation.create({
      tenantId,
      userId: new mongoose.Types.ObjectId(fallbackUserId),
      targetType: "team",
      targetId: new mongoose.Types.ObjectId(teamId),
      type: "workload-rebalance",
      priority: "medium",
      suggestedAction: `Rebalance workload from member ${suggestion.from} to ${suggestion.to}`,
      reason: `Workload delta of ${suggestion.delta} tasks detected`,
      recommendation: suggestion,
      confidence: 0.6,
      tokensUsed: 0,
      metadata: { teamId }
    });
  }

  logger.info({ tenantId, teamId, count: suggestions.length }, "Workload rebalance recommendations generated");

  return suggestions;
}
