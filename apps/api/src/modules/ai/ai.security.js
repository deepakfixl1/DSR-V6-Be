import AuditLog from "#db/models/AuditLog.model.js";
import AIInsight from "#db/models/AIInsight.model.js";
import { createNotification } from "#api/modules/notification/notification.service.js";
import TenantMembership from "#db/models/TenantMembershipSchema.model.js";
import { logger } from "#api/utils/logger.js";

const detectSpike = (recent, baseline, threshold = 1.5) => {
  if (baseline === 0) return recent > 0;
  return recent / baseline >= threshold;
};

export async function analyzeSecuritySignals({ tenantId, userId }) {
  const now = new Date();
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - 7);
  const baselineStart = new Date(now);
  baselineStart.setDate(baselineStart.getDate() - 30);

  const [recentLogs, baselineLogs] = await Promise.all([
    AuditLog.find({ tenantId, createdAt: { $gte: recentStart } }).lean(),
    AuditLog.find({ tenantId, createdAt: { $gte: baselineStart, $lt: recentStart } }).lean()
  ]);

  const countByAction = (logs, pattern) => logs.filter((log) => pattern.test(log.action || "")).length;

  const recentLogins = countByAction(recentLogs, /login/i);
  const baselineLogins = countByAction(baselineLogs, /login/i);

  const recentPermission = countByAction(recentLogs, /permission|role/i);
  const baselinePermission = countByAction(baselineLogs, /permission|role/i);

  const recentExports = countByAction(recentLogs, /export/i);
  const baselineExports = countByAction(baselineLogs, /export/i);

  const findings = [];
  if (detectSpike(recentLogins, baselineLogins)) {
    findings.push("Unusual login volume detected");
  }
  if (detectSpike(recentPermission, baselinePermission)) {
    findings.push("Permission or role changes spiked");
  }
  if (detectSpike(recentExports, baselineExports)) {
    findings.push("Export activity spike detected");
  }

  const result = {
    status: findings.length ? "alert" : "ok",
    findings,
    baselineWindowDays: 23,
    recentWindowDays: 7
  };

  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "tenant",
    entityId: tenantId,
    type: "security",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: "Security signal analysis over last 30 days",
    createdByAI: true
  });

  logger.info({ tenantId, insightId: insight._id }, "Security insight stored");

  return result;
}

export async function detectDashboardAnomalies({ tenantId, userId, metricKey = "tasksCompleted" }) {
  const now = new Date();
  const baselineStart = new Date(now);
  baselineStart.setDate(baselineStart.getDate() - 30);
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - 7);

  const [recentLogs, baselineLogs] = await Promise.all([
    AuditLog.find({ tenantId, createdAt: { $gte: recentStart } }).lean(),
    AuditLog.find({ tenantId, createdAt: { $gte: baselineStart, $lt: recentStart } }).lean()
  ]);

  const recentCount = recentLogs.length;
  const baselineCount = baselineLogs.length;
  const deviation = baselineCount === 0 ? recentCount : (recentCount - baselineCount) / baselineCount;

  const isAnomaly = Math.abs(deviation) > 0.5;

  const result = {
    metricKey,
    recentCount,
    baselineCount,
    deviation: Number.isFinite(deviation) ? deviation : 0,
    isAnomaly
  };

  if (isAnomaly) {
    const owners = await TenantMembership.find({
      tenantId,
      isOwner: true,
      status: "active"
    }).lean();

    await Promise.all(
      owners.map((owner) =>
        createNotification({
          tenantId,
          userId: owner.userId,
          memberId: owner._id,
          scope: "user",
          type: "AI_DASHBOARD_ANOMALY",
          title: "Dashboard anomaly detected",
          body: `Metric ${metricKey} deviated from baseline.`,
          priority: "high",
          payload: result
        })
      )
    );
  }

  await AIInsight.create({
    tenantId,
    userId,
    entityType: "dashboard",
    entityId: tenantId,
    type: "anomaly",
    data: result,
    insight: result,
    tokensUsed: 0,
    explanation: "Dashboard anomaly detection baseline comparison",
    createdByAI: true
  });

  return result;
}
