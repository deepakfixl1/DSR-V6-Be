/**
 * Report AI Service. Handles all AI-powered report generation.
 * Uses central AIService for all OpenAI calls.
 */

import { executeAI } from "../ai/ai.service.js";
import AIReport from "#db/models/AIReport.model.js";
import AIInsight from "#db/models/AIInsight.model.js";
import AIRecommendation from "#db/models/AIRecommendation.model.js";
import Task from "#db/models/Task.model.js";
import TaskActivity from "#db/models/TaskActivity.model.js";
import AuditLog from "#db/models/AuditLog.model.js";
import { getRedisClient } from "#infra/cache/redis.js";
import {logger} from "#api/utils/logger.js";

const reportCacheKey = (reportId) => `ai:report:${reportId}`;
const buildReportKey = ({ tenantId, reportType, periodStart }) =>
  `${tenantId}:${reportType}:${new Date(periodStart).toISOString().split("T")[0]}`;

const ensureAIResultOk = (aiResult, reportType) => {
  if (!aiResult || (aiResult.status && !["ok", "cached"].includes(aiResult.status))) {
    throw new Error(`${reportType} AI generation failed`);
  }
};

async function getCachedReport({ tenantId, reportType, periodStart }) {
  const existing = await AIReport.findOne({
    tenantId,
    reportType,
    "period.start": periodStart,
    status: "completed"
  }).lean();
  if (existing) return existing;

  const reportKey = buildReportKey({ tenantId, reportType, periodStart });
  const insight = await AIInsight.findOne({
    tenantId,
    type: reportType,
    "metadata.reportKey": reportKey
  }).sort({ createdAt: -1 }).lean();

  if (!insight) return null;

  const report = await AIReport.create({
    tenantId,
    reportType,
    generatedBy: insight.userId,
    status: "completed",
    period: { start: periodStart, end: periodStart },
    narrative: insight.data?.summary || insight.insight?.summary,
    summary: insight.data || insight.insight,
    tokensUsed: insight.tokensUsed || 0,
    confidenceScore: insight.data?.confidence || null,
    aiInsightId: insight._id,
    completedAt: new Date()
  });

  return report.toObject();
}

async function cacheReport(report) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(reportCacheKey(report._id), JSON.stringify(report), { EX: 3600 });
}

/**
 * Generate Daily Status Report (DSR)
 */
export async function generateDSR({ tenantId, userId, memberId = null, date = new Date() }) {
  console.log("generateDSR", { tenantId, userId, date });
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const cached = await getCachedReport({
    tenantId,
    reportType: "DSR",
    periodStart: startOfDay
  });
  if (cached) {
    await cacheReport(cached);
    return cached;
  }

  console.log("task find")
  // Fetch data
  const [completedTasks, overdueTasks, newTasks, blockedTasks, activities] = await Promise.all([
    Task.find({
      tenantId,
      status: "done",
      completedAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean(),
    
    Task.find({
      tenantId,
      status: { $in: ["open", "in_progress"] },
      dueAt: { $lt: startOfDay }
    }).lean(),
    
    Task.find({
      tenantId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean(),
    
    Task.find({
      tenantId,
      status: "open",
      "metadata.blocked": true
    }).lean(),
    
    TaskActivity.find({
      tenantId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).limit(100).lean()
  ]);

  console.log("task count", completedTasks.length, overdueTasks.length, newTasks.length, blockedTasks.length, activities.length)
  console.log("task find done")
  // Build AI prompt
  const prompt = `You are an enterprise AI analyst generating a Daily Status Report (DSR).

**Date:** ${date.toISOString().split('T')[0]}

**Data Summary:**
- Completed Tasks: ${completedTasks.length}
- Overdue Tasks: ${overdueTasks.length}
- New Tasks Created: ${newTasks.length}
- Blocked Tasks: ${blockedTasks.length}
- Team Activities: ${activities.length}

**Completed Tasks:**
${completedTasks.slice(0, 10).map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n') || 'None'}

**Overdue Tasks:**
${overdueTasks.slice(0, 10).map(t => `- ${t.title} (Due: ${t.dueAt?.toISOString().split('T')[0]}, Priority: ${t.priority})`).join('\n') || 'None'}

**Blocked Tasks:**
${blockedTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n') || 'None'}

Generate a comprehensive DSR with:
1. Executive summary (2-3 sentences)
2. Key achievements
3. Critical blockers
4. Risk assessment (low/medium/high)
5. Recommended focus for next day

Be concise, actionable, and data-driven.`;

console.log("prompt works",prompt)
  // Define JSON schema for structured output
  const schema = {
    type: "object",
    properties: {
      summary: { type: "string", description: "Executive summary" },
      achievements: {
        type: "array",
        items: { type: "string" },
        description: "Key achievements"
      },
      blockers: {
        type: "array",
        items: { type: "string" },
        description: "Critical blockers"
      },
      riskLevel: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Overall risk level"
      },
      nextDayFocus: {
        type: "array",
        items: { type: "string" },
        description: "Recommended focus areas"
      },
      confidence: { type: "number", description: "Confidence score 0-1" }
    },
    required: ["summary", "achievements", "blockers", "riskLevel", "nextDayFocus", "confidence"]
  };

  console.log("before ai execution")
  // Execute AI
  const aiResult = await executeAI({
    tenantId,
    userId,
    type: "report.dsr",
    prompt,
    schema,
    contextData: {
      completedTasks,
      overdueTasks,
      newTasks,
      blockedTasks,
      activities
    },
    metadata: {
      explainability: {
        dataScope: {
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          newTasks: newTasks.length,
          blockedTasks: blockedTasks.length
        }
      }
    }
  });
  ensureAIResultOk(aiResult, "DSR");

  // Store report
  const report = await AIReport.create({
    tenantId,
    reportType: "DSR",
    generatedBy: userId,
    generatedByMemberId: memberId,
    status: "completed",
    period: { start: startOfDay, end: endOfDay },
    narrative: aiResult.data.summary,
    summary: {
      achievements: aiResult.data.achievements,
      blockers: aiResult.data.blockers,
      nextDayFocus: aiResult.data.nextDayFocus
    },
    risks: [{ level: aiResult.data.riskLevel, description: "Daily risk assessment" }],
    metrics: {
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      newTasks: newTasks.length,
      blockedTasks: blockedTasks.length
    },
    tokensUsed: aiResult.tokensUsed,
    confidenceScore: aiResult.data.confidence,
    dataScope: {
      tasksAnalyzed: completedTasks.length + overdueTasks.length + newTasks.length + blockedTasks.length,
      eventsAnalyzed: activities.length
    },
    completedAt: new Date()
  });

  // Store as AIInsight
  const reportKey = buildReportKey({ tenantId, reportType: "DSR", periodStart: startOfDay });
  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "report",
    entityId: report._id,
    type: "DSR",
    title: `Daily Status Report - ${date.toISOString().split('T')[0]}`,
    data: aiResult.data,
    insight: aiResult.data,
    tokensUsed: aiResult.tokensUsed,
    explanation: aiResult.explanation,
    inputHash: aiResult.inputHash || null,
    metadata: { reportId: report._id, reportKey, memberId }
  });

  report.aiInsightId = insight._id;
  await report.save();
  await cacheReport(report.toObject());

  logger.info("DSR generated successfully", { tenantId, reportId: report._id });

  return report;
}

/**
 * Generate Weekly Team Report
 */
export async function generateWeeklyReport({ tenantId, userId, memberId = null, weekStart }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const cached = await getCachedReport({
    tenantId,
    reportType: "WEEKLY",
    periodStart: weekStart
  });
  if (cached) {
    await cacheReport(cached);
    return cached;
  }

  // Fetch weekly data
  const [tasks, completedTasks, activities] = await Promise.all([
    Task.find({
      tenantId,
      createdAt: { $gte: weekStart, $lt: weekEnd }
    }).lean(),
    
    Task.find({
      tenantId,
      status: "done",
      completedAt: { $gte: weekStart, $lt: weekEnd }
    }).lean(),
    
    TaskActivity.find({
      tenantId,
      createdAt: { $gte: weekStart, $lt: weekEnd }
    }).lean()
  ]);

  // Calculate velocity
  const velocity = completedTasks.length;
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : 0;

  // Workload distribution
  const workloadByUser = {};
  tasks.forEach(task => {
    const assignee = task.assigneeId?.toString() || "unassigned";
    workloadByUser[assignee] = (workloadByUser[assignee] || 0) + 1;
  });

  const prompt = `You are an enterprise AI analyst generating a Weekly Team Report.

**Week:** ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}

**Metrics:**
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasks.length}
- Velocity: ${velocity} tasks/week
- Completion Rate: ${completionRate}%
- Team Activities: ${activities.length}

**Workload Distribution:**
${Object.entries(workloadByUser).map(([user, count]) => `- User ${user}: ${count} tasks`).join('\n')}

Generate a comprehensive weekly report with:
1. Team performance summary
2. Velocity analysis
3. Burnout risk detection (based on workload)
4. Workload imbalance detection
5. Resource allocation recommendations
6. Key risks`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      velocityAnalysis: { type: "string" },
      burnoutRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            userId: { type: "string" },
            riskLevel: { type: "string", enum: ["low", "medium", "high"] },
            reason: { type: "string" }
          }
        }
      },
      workloadImbalance: { type: "boolean" },
      recommendations: { type: "array", items: { type: "string" } },
      confidence: { type: "number" }
    },
    required: ["summary", "velocityAnalysis", "burnoutRisks", "workloadImbalance", "recommendations", "confidence"]
  };

  const aiResult = await executeAI({
    tenantId,
    userId,
    type: "report.weekly",
    prompt,
    schema,
    contextData: {
      tasks,
      completedTasks,
      activities,
      workloadByUser
    },
    metadata: {
      explainability: {
        dataScope: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          velocity
        }
      }
    }
  });
  ensureAIResultOk(aiResult, "WEEKLY");

  const report = await AIReport.create({
    tenantId,
    reportType: "WEEKLY",
    generatedBy: userId,
    generatedByMemberId: memberId,
    status: "completed",
    period: { start: weekStart, end: weekEnd },
    narrative: aiResult.data.summary,
    summary: {
      velocity,
      completionRate,
      velocityAnalysis: aiResult.data.velocityAnalysis
    },
    risks: aiResult.data.burnoutRisks.map(r => ({
      type: "burnout",
      level: r.riskLevel,
      description: r.reason,
      userId: r.userId
    })),
    recommendations: aiResult.data.recommendations.map(r => ({ text: r, priority: "medium" })),
    metrics: {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      velocity,
      completionRate
    },
    tokensUsed: aiResult.tokensUsed,
    confidenceScore: aiResult.data.confidence,
    dataScope: {
      tasksAnalyzed: tasks.length,
      eventsAnalyzed: activities.length
    },
    completedAt: new Date()
  });

  const reportKey = buildReportKey({ tenantId, reportType: "WEEKLY", periodStart: weekStart });
  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "report",
    entityId: report._id,
    type: "WEEKLY",
    title: `Weekly Team Report - ${weekStart.toISOString().split('T')[0]}`,
    data: aiResult.data,
    insight: aiResult.data,
    tokensUsed: aiResult.tokensUsed,
    explanation: aiResult.explanation,
    inputHash: aiResult.inputHash || null,
    metadata: { reportId: report._id, reportKey, memberId }
  });

  report.aiInsightId = insight._id;
  await report.save();
  await cacheReport(report.toObject());

  logger.info("Weekly report generated", { tenantId, reportId: report._id });

  return report;
}

/**
 * Generate Monthly Performance Report
 */
export async function generateMonthlyReport({ tenantId, userId, memberId = null, monthStart }) {
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const cached = await getCachedReport({
    tenantId,
    reportType: "MONTHLY",
    periodStart: monthStart
  });
  if (cached) {
    await cacheReport(cached);
    return cached;
  }

  // Fetch monthly data
  const [tasks, completedTasks, auditLogs] = await Promise.all([
    Task.find({
      tenantId,
      createdAt: { $gte: monthStart, $lt: monthEnd }
    }).lean(),
    
    Task.find({
      tenantId,
      status: "done",
      completedAt: { $gte: monthStart, $lt: monthEnd }
    }).lean(),
    
    AuditLog.find({
      tenantId,
      createdAt: { $gte: monthStart, $lt: monthEnd }
    }).limit(1000).lean()
  ]);

  // Calculate KPIs
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : 0;
  const avgCompletionTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => {
        const duration = t.completedAt - t.createdAt;
        return sum + duration;
      }, 0) / completedTasks.length / (1000 * 60 * 60 * 24) // days
    : 0;

  // Priority distribution
  const priorityDist = {};
  tasks.forEach(t => {
    priorityDist[t.priority] = (priorityDist[t.priority] || 0) + 1;
  });

  const prompt = `You are an enterprise AI analyst generating a Monthly Performance Report.

**Month:** ${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}

**KPIs:**
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- Completion Rate: ${completionRate}%
- Avg Completion Time: ${avgCompletionTime.toFixed(1)} days
- Audit Events: ${auditLogs.length}

**Priority Distribution:**
${Object.entries(priorityDist).map(([p, c]) => `- ${p}: ${c}`).join('\n')}

Generate a comprehensive monthly report with:
1. Executive summary
2. Trend analysis (growth/decline patterns)
3. Performance highlights
4. Weak areas identification
5. Improvement suggestions
6. Forecast for next month (completion rate, task volume)
7. Risk assessment`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      trends: {
        type: "object",
        properties: {
          taskVolumeTrend: { type: "string", enum: ["increasing", "stable", "decreasing"] },
          completionRateTrend: { type: "string", enum: ["improving", "stable", "declining"] },
          analysis: { type: "string" }
        }
      },
      highlights: { type: "array", items: { type: "string" } },
      weakAreas: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      forecast: {
        type: "object",
        properties: {
          nextMonthCompletionRate: { type: "number" },
          nextMonthTaskVolume: { type: "number" },
          confidence: { type: "number" }
        }
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            description: { type: "string" }
          }
        }
      },
      confidence: { type: "number" }
    },
    required: ["summary", "trends", "highlights", "weakAreas", "improvements", "forecast", "risks", "confidence"]
  };

  const aiResult = await executeAI({
    tenantId,
    userId,
    type: "report.monthly",
    prompt,
    schema,
    contextData: {
      tasks,
      completedTasks,
      auditLogs,
      priorityDist
    },
    metadata: {
      explainability: {
        dataScope: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          auditLogs: auditLogs.length
        }
      }
    }
  });
  ensureAIResultOk(aiResult, "MONTHLY");

  const report = await AIReport.create({
    tenantId,
    reportType: "MONTHLY",
    generatedBy: userId,
    generatedByMemberId: memberId,
    status: "completed",
    period: { start: monthStart, end: monthEnd },
    narrative: aiResult.data.summary,
    summary: {
      highlights: aiResult.data.highlights,
      weakAreas: aiResult.data.weakAreas
    },
    trends: aiResult.data.trends,
    risks: aiResult.data.risks,
    recommendations: aiResult.data.improvements.map(i => ({ text: i, priority: "high" })),
    forecast: aiResult.data.forecast,
    metrics: {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate,
      avgCompletionTime: avgCompletionTime.toFixed(1)
    },
    tokensUsed: aiResult.tokensUsed,
    confidenceScore: aiResult.data.confidence,
    dataScope: {
      tasksAnalyzed: tasks.length,
      eventsAnalyzed: auditLogs.length
    },
    completedAt: new Date()
  });

  const reportKey = buildReportKey({ tenantId, reportType: "MONTHLY", periodStart: monthStart });
  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "report",
    entityId: report._id,
    type: "MONTHLY",
    title: `Monthly Performance Report - ${monthStart.toISOString().split('T')[0]}`,
    data: aiResult.data,
    insight: aiResult.data,
    tokensUsed: aiResult.tokensUsed,
    explanation: aiResult.explanation,
    inputHash: aiResult.inputHash || null,
    metadata: { reportId: report._id, reportKey, memberId }
  });

  report.aiInsightId = insight._id;
  await report.save();
  await cacheReport(report.toObject());

  // Store recommendations
  for (const improvement of aiResult.data.improvements) {
    await AIRecommendation.create({
      tenantId,
      userId,
      type: "monthly-improvement",
      recommendation: { text: improvement },
      confidence: aiResult.data.confidence,
      tokensUsed: 0,
      metadata: { reportId: report._id }
    });
  }

  logger.info("Monthly report generated", { tenantId, reportId: report._id });

  return report;
}

/**
 * Generate Quarterly Performance Report
 */
export async function generateQuarterlyReport({ tenantId, userId, memberId = null, quarterStart }) {
  const quarterEnd = new Date(quarterStart);
  quarterEnd.setMonth(quarterEnd.getMonth() + 3);

  const cached = await getCachedReport({
    tenantId,
    reportType: "QUARTERLY",
    periodStart: quarterStart
  });
  if (cached) {
    await cacheReport(cached);
    return cached;
  }

  const [tasks, completedTasks, auditLogs] = await Promise.all([
    Task.find({
      tenantId,
      createdAt: { $gte: quarterStart, $lt: quarterEnd }
    }).lean(),
    Task.find({
      tenantId,
      status: "done",
      completedAt: { $gte: quarterStart, $lt: quarterEnd }
    }).lean(),
    AuditLog.find({
      tenantId,
      createdAt: { $gte: quarterStart, $lt: quarterEnd }
    }).limit(2000).lean()
  ]);

  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : 0;

  const prompt = `You are an enterprise AI analyst generating a Quarterly Performance Report.

**Quarter:** ${quarterStart.toISOString().split('T')[0]} to ${quarterEnd.toISOString().split('T')[0]}

**KPIs:**
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- Completion Rate: ${completionRate}%
- Audit Events: ${auditLogs.length}

Generate a comprehensive quarterly report with:
1. Executive summary
2. Trend analysis (quarter-over-quarter patterns)
3. Performance highlights
4. Weak areas identification
5. Improvement suggestions
6. Forecast for next quarter
7. Risk assessment`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      trends: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
      weakAreas: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      forecast: { type: "string" },
      risks: { type: "array", items: { type: "string" } },
      confidence: { type: "number" }
    },
    required: ["summary", "trends", "highlights", "weakAreas", "improvements", "forecast", "risks", "confidence"]
  };

  const aiResult = await executeAI({
    tenantId,
    userId,
    type: "report.quarterly",
    prompt,
    schema,
    contextData: {
      tasks,
      completedTasks,
      auditLogs
    }
  });
  ensureAIResultOk(aiResult, "QUARTERLY");

  const report = await AIReport.create({
    tenantId,
    reportType: "QUARTERLY",
    generatedBy: userId,
    generatedByMemberId: memberId,
    status: "completed",
    period: { start: quarterStart, end: quarterEnd },
    narrative: aiResult.data.summary,
    summary: {
      highlights: aiResult.data.highlights,
      weakAreas: aiResult.data.weakAreas
    },
    trends: aiResult.data.trends,
    risks: aiResult.data.risks,
    recommendations: aiResult.data.improvements.map((i) => ({ text: i, priority: "high" })),
    forecast: { nextQuarter: aiResult.data.forecast },
    metrics: {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate
    },
    tokensUsed: aiResult.tokensUsed,
    confidenceScore: aiResult.data.confidence,
    dataScope: {
      tasksAnalyzed: tasks.length,
      eventsAnalyzed: auditLogs.length
    },
    completedAt: new Date()
  });

  const reportKey = buildReportKey({ tenantId, reportType: "QUARTERLY", periodStart: quarterStart });
  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "report",
    entityId: report._id,
    type: "QUARTERLY",
    title: `Quarterly Performance Report - ${quarterStart.toISOString().split('T')[0]}`,
    data: aiResult.data,
    insight: aiResult.data,
    tokensUsed: aiResult.tokensUsed,
    explanation: aiResult.explanation,
    inputHash: aiResult.inputHash || null,
    metadata: { reportId: report._id, reportKey, memberId }
  });

  report.aiInsightId = insight._id;
  await report.save();
  await cacheReport(report.toObject());

  for (const improvement of aiResult.data.improvements) {
    await AIRecommendation.create({
      tenantId,
      userId,
      type: "quarterly-improvement",
      recommendation: { text: improvement },
      confidence: aiResult.data.confidence,
      tokensUsed: 0,
      metadata: { reportId: report._id }
    });
  }

  logger.info("Quarterly report generated", { tenantId, reportId: report._id });

  return report;
}

/**
 * Generate Yearly Strategic Intelligence Report (Enterprise only)
 */
export async function generateYearlyReport({ tenantId, userId, memberId = null, year }) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const cached = await getCachedReport({
    tenantId,
    reportType: "YEARLY",
    periodStart: yearStart
  });
  if (cached) {
    await cacheReport(cached);
    return cached;
  }

  // Fetch comprehensive yearly data
  const [tasks, completedTasks, auditLogs, aiUsage] = await Promise.all([
    Task.find({
      tenantId,
      createdAt: { $gte: yearStart, $lt: yearEnd }
    }).lean(),
    
    Task.find({
      tenantId,
      status: "done",
      completedAt: { $gte: yearStart, $lt: yearEnd }
    }).lean(),
    
    AuditLog.find({
      tenantId,
      createdAt: { $gte: yearStart, $lt: yearEnd }
    }).limit(5000).lean(),
    
    AIInsight.find({
      tenantId,
      createdAt: { $gte: yearStart, $lt: yearEnd }
    }).lean()
  ]);

  // Calculate yearly metrics
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length * 100).toFixed(1) : 0;
  
  // Monthly breakdown
  const monthlyBreakdown = {};
  for (let m = 0; m < 12; m++) {
    const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
    monthlyBreakdown[monthKey] = {
      created: 0,
      completed: 0
    };
  }
  
  tasks.forEach(t => {
    const monthKey = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyBreakdown[monthKey]) monthlyBreakdown[monthKey].created++;
  });
  
  completedTasks.forEach(t => {
    const monthKey = `${t.completedAt.getFullYear()}-${String(t.completedAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyBreakdown[monthKey]) monthlyBreakdown[monthKey].completed++;
  });

  // Security events
  const securityEvents = auditLogs.filter(log => 
    log.action?.includes('security') || 
    log.action?.includes('permission') ||
    log.action?.includes('role')
  ).length;

  const prompt = `You are an enterprise AI strategist generating a Yearly Strategic Intelligence Report.

**Year:** ${year}

**Annual Metrics:**
- Total Tasks Created: ${tasks.length}
- Total Tasks Completed: ${completedTasks.length}
- Overall Completion Rate: ${completionRate}%
- Security Events: ${securityEvents}
- AI Insights Generated: ${aiUsage.length}
- Total Audit Events: ${auditLogs.length}

**Monthly Breakdown:**
${Object.entries(monthlyBreakdown).map(([month, data]) => 
  `${month}: Created ${data.created}, Completed ${data.completed}`
).join('\n')}

Generate a comprehensive strategic report with:
1. Executive narrative (year in review)
2. Year-over-year comparison insights
3. Strategic risks identified
4. Operational inefficiencies
5. Forecast for next year (task volume, completion trends)
6. Investment recommendations
7. Scaling suggestions
8. Security maturity score (0-100)
9. Cost optimization insights
10. Top 5 strategic priorities for next year`;

  const schema = {
    type: "object",
    properties: {
      executiveNarrative: { type: "string" },
      yoyComparison: {
        type: "object",
        properties: {
          growth: { type: "string" },
          keyChanges: { type: "array", items: { type: "string" } }
        }
      },
      strategicRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            risk: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            mitigation: { type: "string" }
          }
        }
      },
      inefficiencies: { type: "array", items: { type: "string" } },
      forecast: {
        type: "object",
        properties: {
          nextYearTaskVolume: { type: "number" },
          nextYearCompletionRate: { type: "number" },
          growthRate: { type: "number" },
          confidence: { type: "number" }
        }
      },
      investments: { type: "array", items: { type: "string" } },
      scalingSuggestions: { type: "array", items: { type: "string" } },
      securityMaturityScore: { type: "number", minimum: 0, maximum: 100 },
      costOptimization: { type: "array", items: { type: "string" } },
      strategicPriorities: { type: "array", items: { type: "string" }, maxItems: 5 },
      confidence: { type: "number" }
    },
    required: [
      "executiveNarrative", "yoyComparison", "strategicRisks", "inefficiencies",
      "forecast", "investments", "scalingSuggestions", "securityMaturityScore",
      "costOptimization", "strategicPriorities", "confidence"
    ]
  };

  const aiResult = await executeAI({
    tenantId,
    userId,
    type: "report.yearly",
    prompt,
    schema,
    contextData: {
      tasks,
      completedTasks,
      auditLogs,
      aiUsage,
      monthlyBreakdown
    },
    metadata: {
      explainability: {
        dataScope: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          securityEvents,
          aiInsights: aiUsage.length
        }
      }
    }
  });
  ensureAIResultOk(aiResult, "YEARLY");

  const report = await AIReport.create({
    tenantId,
    reportType: "YEARLY",
    generatedBy: userId,
    generatedByMemberId: memberId,
    status: "completed",
    period: { start: yearStart, end: yearEnd },
    narrative: aiResult.data.executiveNarrative,
    summary: {
      yoyComparison: aiResult.data.yoyComparison,
      securityMaturityScore: aiResult.data.securityMaturityScore,
      strategicPriorities: aiResult.data.strategicPriorities
    },
    risks: aiResult.data.strategicRisks,
    recommendations: [
      ...aiResult.data.investments.map(i => ({ type: "investment", text: i, priority: "high" })),
      ...aiResult.data.scalingSuggestions.map(s => ({ type: "scaling", text: s, priority: "medium" })),
      ...aiResult.data.costOptimization.map(c => ({ type: "cost", text: c, priority: "medium" }))
    ],
    forecast: aiResult.data.forecast,
    trends: {
      monthlyBreakdown,
      inefficiencies: aiResult.data.inefficiencies
    },
    metrics: {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate,
      securityEvents,
      aiInsightsGenerated: aiUsage.length
    },
    tokensUsed: aiResult.tokensUsed,
    confidenceScore: aiResult.data.confidence,
    dataScope: {
      tasksAnalyzed: tasks.length,
      eventsAnalyzed: auditLogs.length,
      usersAnalyzed: 0 // TODO: Add user count
    },
    completedAt: new Date()
  });

  const reportKey = buildReportKey({ tenantId, reportType: "YEARLY", periodStart: yearStart });
  const insight = await AIInsight.create({
    tenantId,
    userId,
    entityType: "report",
    entityId: report._id,
    type: "YEARLY",
    title: `Yearly Strategic Report - ${year}`,
    data: aiResult.data,
    insight: aiResult.data,
    tokensUsed: aiResult.tokensUsed,
    explanation: aiResult.explanation,
    inputHash: aiResult.inputHash || null,
    metadata: { reportId: report._id, reportKey, memberId }
  });

  report.aiInsightId = insight._id;
  await report.save();
  await cacheReport(report.toObject());

  // Store strategic recommendations
  for (const priority of aiResult.data.strategicPriorities) {
    await AIRecommendation.create({
      tenantId,
      userId,
      type: "strategic-priority",
      recommendation: { text: priority, year: year + 1 },
      confidence: aiResult.data.confidence,
      tokensUsed: 0,
      metadata: { reportId: report._id }
    });
  }

  logger.info("Yearly strategic report generated", { tenantId, reportId: report._id, year });

  return report;
}
