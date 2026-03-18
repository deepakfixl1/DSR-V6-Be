import AIReport from "#db/models/AIReport.model.js";
import TaskTimeLog from "#db/models/TaskTimeLog.model.js";
import AIInsight from "#db/models/AIInsight.model.js";
import { logger } from "#api/utils/logger.js";

const average = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

export async function forecastCompletion({ tenantId, userId }) {
  const reports = await AIReport.find({
    tenantId,
    reportType: { $in: ["DSR", "WEEKLY", "MONTHLY", "QUARTERLY"] },
    status: "completed"
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  const completions = reports.map((r) => Number(r.metrics?.completedTasks || 0));
  const avg = average(completions);
  const forecast = Math.round(avg);

  const result = {
    forecastType: "completion",
    nextPeriodCompletion: forecast,
    confidence: completions.length >= 6 ? 0.7 : 0.4,
    baselineSamples: completions.length
  };

  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "tenant",
    entityId: tenantId,
    type: "forecast",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: `Average completion over ${completions.length} periods`,
    createdByAI: true
  });

  logger.info({ tenantId, insightId: insight._id }, "Completion forecast stored");

  return result;
}

export async function forecastCapacity({ tenantId, userId }) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);

  const logs = await TaskTimeLog.find({
    tenantId,
    startedAt: { $gte: start }
  }).lean();

  const totalMinutes = logs.reduce((sum, log) => sum + (log.minutes || 0), 0);
  const capacityHours = Math.round(totalMinutes / 60);

  const result = {
    forecastType: "capacity",
    nextMonthHours: capacityHours,
    confidence: logs.length > 0 ? 0.6 : 0.2,
    baselineSamples: logs.length
  };

  await AIInsight.create({
    tenantId,
    userId,
    entityType: "tenant",
    entityId: tenantId,
    type: "forecast",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: "Capacity estimated from last 30 days time logs",
    createdByAI: true
  });

  logger.info({ tenantId }, "Capacity forecast stored");

  return result;
}

export async function forecastRevenue({ tenantId, userId }) {
  const result = {
    status: "insufficient_data",
    explanation: "Revenue data not available in current tenant dataset"
  };

  await AIInsight.create({
    tenantId,
    userId,
    entityType: "tenant",
    entityId: tenantId,
    type: "forecast",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: result.explanation,
    createdByAI: true
  });

  return result;
}
