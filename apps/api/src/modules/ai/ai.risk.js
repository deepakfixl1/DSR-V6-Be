import mongoose from "mongoose";
import Task from "#db/models/Task.model.js";
import TaskTimeLog from "#db/models/TaskTimeLog.model.js";
import AIInsight from "#db/models/AIInsight.model.js";
import { logger } from "#api/utils/logger.js";

const levelFromScore = (score) => {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
};

export async function analyzeProjectRisk({ tenantId, projectId, userId }) {
  const tasks = await Task.find({
    tenantId,
    projectId: new mongoose.Types.ObjectId(projectId),
    status: { $in: ["open", "in_progress"] }
  }).lean();

  const overdue = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date()).length;
  const highPriority = tasks.filter((t) => ["high", "critical"].includes(t.priority)).length;

  const riskScore = Math.min(
    100,
    Math.round((overdue * 10 + highPriority * 5 + tasks.length) / Math.max(1, tasks.length) * 20)
  );

  const riskLevel = levelFromScore(riskScore);
  const recommendedActions = [];
  if (overdue > 0) recommendedActions.push("Address overdue tasks immediately");
  if (highPriority > 0) recommendedActions.push("Prioritize high-risk tasks and review blockers");

  const result = {
    riskScore,
    riskLevel,
    explanation: `Overdue: ${overdue}, High priority: ${highPriority}, Open tasks: ${tasks.length}`,
    recommendedActions
  };

  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "project",
    entityId: new mongoose.Types.ObjectId(projectId),
    type: "risk",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: result.explanation,
    createdByAI: true,
    metadata: { overdue, highPriority }
  });

  logger.info({ tenantId, projectId, insightId: insight._id }, "Project risk insight stored");

  return result;
}

export async function analyzeBurnoutRisk({ tenantId, userId }) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);

  const logs = await TaskTimeLog.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), startedAt: { $gte: start } } },
    { $group: { _id: "$memberId", minutes: { $sum: "$minutes" } } }
  ]);

  const memberLog = logs.find((l) => String(l._id) === String(userId));
  const minutes = memberLog?.minutes || 0;
  const hours = minutes / 60;
  const riskScore = Math.min(100, Math.round((hours / 120) * 100));
  const riskLevel = levelFromScore(riskScore);

  const result = {
    riskScore,
    riskLevel,
    explanation: `Logged ${hours.toFixed(1)} hours in last 30 days`,
    recommendedActions: riskScore >= 80 ? ["Reduce workload or add support"] : []
  };

  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "user",
    entityId: new mongoose.Types.ObjectId(userId),
    type: "risk",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: result.explanation,
    createdByAI: true
  });

  logger.info({ tenantId, userId, insightId: insight._id }, "User burnout risk insight stored");

  return result;
}
