import { z } from "zod";
import mongoose from "mongoose";
import { config } from "#api/config/env.js";
import { executeAI as _executeAI } from "./ai.service.js"; // kept for other controllers
import { AI_TYPES, AI_FEATURES, OPENAI_MODEL } from "./ai.model.js";
import { appendShortTermContext } from "./ai.memory.js";
import AIExecutionLog from "#db/models/AIExecutionLog.model.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { analyzeReportAgainstGoals, getDSRSuggestions, getGoalProgressAnalysis, getPeriodGoalAnalysis } from "#api/modules/goalAnalysis/goalAnalysis.service.js";
import { listPendingGoals, listCurrentWeekGoals } from "#api/modules/workGoals/workGoal.service.js";
import WorkReport from "#db/models/WorkReport.model.js";
import { WorkGoal } from "#db/models/index.js";
import { structuredJSONResponse } from "./ai.openai.js";
import { loadTenantContext, buildAssistantPrompt } from "./ai.tenantContext.js";

const assistantSchema = z.object({
  tenantId: z.string().min(24).optional(),
  query: z.string().min(1).max(2000),
  context: z.record(z.any()).optional().default({}),
  conversationHistory: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .optional()
    .default([]),
});

const auditSearchSchema = z.object({
  tenantId: z.string().min(24).optional(),
  query: z.string().min(3)
});

/**
 * Parse relative time windows from a natural language query.
 * Example: "last week" -> { start, end }
 */
const parseRelativeWindow = (query) => {
  const now = new Date();
  if (/last\s+week/i.test(query)) {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end };
  }
  if (/last\s+month/i.test(query)) {
    const end = new Date(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  }
  return null;
};

/**
 * Convert audit NLP query into MongoDB filters.
 * Example: "Who changed billing last week?"
 */
const RESOURCE_PATTERNS = [
  { type: "billing", regex: /billing|invoice|payment|subscription/i },
  { type: "user", regex: /user|account|profile/i },
  { type: "role", regex: /role|permission|access/i },
  { type: "audit_log", regex: /audit|activity|log|history/i },
  { type: "task", regex: /task|todo|assignment/i },
  { type: "department", regex: /department|team|division/i },
  { type: "report", regex: /report|analytics|insight/i },
  { type: "member", regex: /member|employee|staff/i },
  { type: "resource", regex: /resource|asset/i }
];

const ACTION_PATTERNS = [
  { action: "create", regex: /create|add|new|register/i },
  { action: "update", regex: /update|edit|change|modify/i },
  { action: "delete", regex: /delete|remove|destroy/i },
  { action: "view", regex: /view|show|get|fetch|see/i },
  { action: "assign", regex: /assign|allocate/i },
  { action: "approve", regex: /approve|confirm/i },
  { action: "reject", regex: /reject|decline/i }
];

export const parseAuditQuery = (query) => {
  const normalized = query.toLowerCase();
  const window = parseRelativeWindow(normalized);

  // 🔹 Detect resource safely (first match wins)
  const resourceMatch = RESOURCE_PATTERNS.find(r =>
    r.regex.test(normalized)
  );

  const actionMatch = ACTION_PATTERNS.find(a =>
    a.regex.test(normalized)
  );

  const resourceType = resourceMatch?.type ?? null;
  const action = actionMatch?.action ?? null;

  const filter = {};

  if (resourceType) {
    filter.resourceType = resourceType;
  }

  if (action) {
    // since we normalize action, no need for regex
    filter.action = action;
  }

  if (window) {
    filter.createdAt = {
      $gte: window.start,
      $lte: window.end
    };
  }

  return {
    filter,
    parsed: {
      resourceType,
      action,
      window
    }
  };
};


/**
 * POST /api/ai/assistant/query
 * Smart, context-aware workspace assistant.
 * Auto-fetches full tenant data and builds a role-aware prompt.
 * Supports multi-turn conversation history.
 * NEVER returns 500 — always returns a graceful response.
 */
export async function assistantQueryController(req, res, next) {
  const startTime = Date.now();
  let tenantId, userId, query, conversationHistory;

  try {
    const parsed = assistantSchema.parse(req.body);
    tenantId = parsed.tenantId || req.tenant?.id || req.tenantId;
    userId = req.user?.id;
    query = parsed.query.trim();
    conversationHistory = parsed.conversationHistory ?? [];

    if (!tenantId) throw ApiError.badRequest("tenantId is required");
    if (!userId)   throw ApiError.unauthorized("Authentication required");
  } catch (err) {
    return next(err);
  }

  // 1. Load comprehensive tenant context — catches all internal failures
  let context;
  try {
    context = await loadTenantContext({ tenantId, userId });
  } catch (err) {
    logger.error({ err, tenantId, userId }, "loadTenantContext failed");
    context = {
      tenant: null, currentUser: { role: "unknown", isOwner: false, department: null, permissions: [] },
      organization: { totalMembers: 0, departments: [], members: [] },
      weekCycles: [], goals: { stats: { total:0,completed:0,inProgress:0,notStarted:0,blocked:0,underReview:0,carriedForward:0,pendingApproval:0,avgProgress:0 }, items: [] },
      blockers: { stats: { total:0,critical:0,escalated:0,slaBreached:0 }, items: [] },
      reports: { stats: { total:0,submitted:0,approved:0,draft:0,rejected:0,lateSubmissions:0 }, recent: [] },
      plan: { name:"Free", limits:{}, features:{}, status:null },
      pendingApprovals: 0, notifications: [], fetchedAt: new Date().toISOString(),
    };
  }

  // 2. Build the AI prompt — catches formatting failures
  let prompt;
  try {
    prompt = buildAssistantPrompt({ context, userQuery: query, conversationHistory });
  } catch (err) {
    logger.error({ err }, "buildAssistantPrompt failed");
    prompt = `You are an AI assistant. Answer this question: ${query}\nReturn JSON: { "message": "..." }`;
  }

  // 3. Response schema
  const responseSchema = {
    type: "object",
    properties: {
      message: { type: "string" },
      intent: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
      actionItems: { type: "array", items: { type: "string" } },
      dataUsed: { type: "array", items: { type: "string" } },
    },
    required: ["message"],
    additionalProperties: false,
  };

  // 4. Call AI
  let aiData = null;
  let tokensUsed = 0;
  let aiError = null;

  try {
    const aiResult = await structuredJSONResponse({ prompt, schema: responseSchema, timeoutMs: 30000 });
    aiData = aiResult.data;
    tokensUsed = aiResult.usageMetadata?.totalTokenCount ?? 0;
  } catch (err) {
    aiError = err.message;
    logger.error({ err: err.message, tenantId, userId }, "AI assistant call failed");
  }

  const durationMs = Date.now() - startTime;

  // 5. Log + memory — fire-and-forget, never block response
  try {
    AIExecutionLog.create({
      tenantId, userId,
      type: AI_TYPES.chatWorkspaceAssistant,
      feature: AI_FEATURES.assistant,
      prompt: query,
      responseJson: aiData,
      model: "ai-assistant",
      status: aiData ? "success" : "failed",
      tokensUsed, durationMs, latency: durationMs,
      error: aiError,
    }).catch((e) => logger.warn({ e: e.message }, "AI log failed"));
  } catch (e) {
    logger.warn({ e: e.message }, "AI log sync error");
  }

  appendShortTermContext(tenantId, {
    query,
    response: aiData?.message ?? null,
    intent: aiData?.intent ?? "general",
    at: new Date().toISOString(),
  }).catch(() => {});

  // 6. Fallback response if AI returned nothing
  if (!aiData) {
    const { goals, blockers, reports, organization, weekCycles } = context;
    const cyc = weekCycles[0];
    const fallbackMessage = [
      `Here's a summary for **${context.tenant?.name ?? "your organization"}**:`,
      ``,
      `**Goals (last 7 days):** ${goals.stats.total} total — ✅ ${goals.stats.completed} completed, 🔄 ${goals.stats.inProgress} in progress, 🚫 ${goals.stats.blocked} blocked`,
      `**Open Blockers:** ${blockers.stats.total}${blockers.stats.critical > 0 ? ` (⚠️ ${blockers.stats.critical} critical)` : ""}`,
      `**Reports this week:** ${reports.stats.submitted} submitted, ${reports.stats.approved} approved, ${reports.stats.lateSubmissions} late`,
      `**Team:** ${organization.totalMembers} active members across ${organization.departments.length} departments`,
      cyc ? `**Current Week:** ${cyc.period} — ${cyc.status} (${cyc.summary?.completionPct ?? 0}% complete)` : "",
      `**Pending Approvals:** ${context.pendingApprovals}`,
      ``,
      `_Note: AI response unavailable. Showing live data summary._`,
    ].filter(Boolean).join("\n");

    return res.json({
      status: "ok",
      data: { message: fallbackMessage, intent: "summary", highlights: [], actionItems: [], dataUsed: ["goals","blockers","reports","team"] },
      tokensUsed: 0, durationMs, fromFallback: true,
    });
  }

  return res.json({
    status: "ok",
    data: aiData,
    tokensUsed,
    durationMs,
    contextSummary: {
      goalsTotal: context.goals.stats.total,
      blockersOpen: context.blockers.stats.total,
      membersActive: context.organization.totalMembers,
      currentCycleStatus: context.weekCycles[0]?.status ?? null,
    },
  });
}

/**
 * POST /api/ai/audit/search
 * Example body:
 * { "tenantId": "...", "query": "Who changed billing last week?" }
 */
export async function auditSearchController(req, res, next) {
  try {
    const payload = auditSearchSchema.parse(req.body);
    const tenantId = payload.tenantId || req.aiContext?.tenantId;
    const query = payload.query;
    const userId = req.user?.id;
    if (!tenantId) {
      throw ApiError.badRequest("tenantId is required");
    }

    const parsedIntent = parseAuditQuery(query);

    await AIExecutionLog.create({
      tenantId,
      userId,
      type: AI_TYPES.auditNaturalLanguageSearch,
      feature: AI_FEATURES.auditSearch,
      inputHash: null,
      prompt: query,
      responseJson: parsedIntent,
      model: "rules-v1",
      status: "success",
      tokensUsed: 0,
      durationMs: 0,
      metadata: { parsedIntent: parsedIntent.parsed }
    });

    res.json({
      status: "ok",
      data: parsedIntent,
      explanation: "Parsed audit search intent into MongoDB filters",
      reasoning: "Rule-based NLP extraction",
      tokensUsed: 0,
      modelVersion: "rules-v1"
    });
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/ai/dsr/suggestions
 */
export async function dsrSuggestionController(req, res, next) {
  try {
    // employeeMemberId may come from query or membership context.
    // If neither is available, look it up from TenantMembership by userId + tenantId.
    let employeeMemberId =
      req.validated?.query?.employeeMemberId ?? req.membership?._id ?? null;

    if (!employeeMemberId && req.user?.id && req.tenant?.id) {
      const { TenantMembership } = await import("#db/models/index.js");
      const mem = await TenantMembership.findOne({
        tenantId: new (await import("mongoose")).default.Types.ObjectId(req.tenant.id),
        userId: new (await import("mongoose")).default.Types.ObjectId(req.user.id),
        status: "active",
      }).select("_id").lean();
      employeeMemberId = mem?._id ?? null;
    }

    if (!employeeMemberId) {
      // Return empty suggestions gracefully — user has no membership/goals
      return res.json({
        status: "ok",
        data: { achievements: [], challenges: [], plans: [], blockers: [], notes: "" },
      });
    }

    const raw = await getDSRSuggestions({
      tenantId: req.tenant.id,
      userId: req.user.id,
      employeeMemberId,
      date: req.validated?.query?.date ?? new Date(),
    });

    // Service now returns pre-built, deterministic arrays from real goal data
    const data = {
      tasks: raw.tasks ?? [],
      achievements: raw.achievements ?? [],
      challenges: raw.challenges ?? [],
      plans: raw.plans ?? [],
      blockers: [],
      notes: "",
    };
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/goals/pending
 */
export async function pendingGoalsController(req, res, next) {
  try {
    const employeeMemberId = req.validated.query.employeeMemberId ?? req.membership?._id;
    const data = await listPendingGoals({
      tenantId: req.tenant.id,
      employeeMemberId,
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/goals/recommendations
 */
export async function goalRecommendationsController(req, res, next) {
  try {
    const employeeMemberId = req.validated.query.employeeMemberId ?? req.membership?._id;
    const { goals } = await listCurrentWeekGoals({
      tenantId: req.params.tenantId,
      employeeMemberId,
      date: new Date(),
    });

    const focusGoal = goals[0] ?? null;
    const recommendations = goals.slice(0, 5).map((goal) => ({
      goalId: goal._id,
      title: goal.title,
      dueDate: goal.timeline?.dueDate,
      status: goal.status,
      progressPct: goal.managerApprovedProgressPct ?? 0,
    }));

    res.json({
      status: "ok",
      data: { focusGoal, recommendations },
    });
  } catch (error) {
    next(error);
  }
}
function buildManagerGoalAnalysisPrompt({ report, linkedGoals, allWeekGoals, stats, today }) {
  const todayIso = today.toISOString();

  return `
You are an expert work-performance analyst helping a manager understand an employee's daily progress in the context of this week's goals.

Your job is to analyze:
1. today's DSR report,
2. all employee goals for the current week up to today,
3. status and progress of each goal,
4. how much today's report contributes toward weekly goals,
5. a full manager-ready summary.

You must return ONLY valid JSON matching the requested schema.

IMPORTANT RULES:
- Be objective and evidence-based.
- Use only the provided report and goals data.
- Do not invent goals, progress, blockers, or achievements.
- Infer reasonable completion percentages only from the provided data.
- The DSR completion percentage means: how much today's report demonstrates progress against the employee's active weekly goals up to today.
- Consider both report content and goal statuses.
- If the report mentions measurable outcomes that map clearly to goals, increase confidence and completion estimates.
- If a goal is marked COMPLETED, reflect that strongly.
- If a goal is NOT_STARTED or BLOCKED and report has no supporting evidence, mention that clearly.
- Write the manager narrative in professional, concise language.
- Highlight risks, blockers, weak evidence, and recommended follow-ups.
- Mention if the employee appears ahead, on track, or behind for this point in the week.

TODAY:
${todayIso}

WORK REPORT:
${JSON.stringify(report, null, 2)}

LINKED GOALS FROM REPORT:
${JSON.stringify(linkedGoals, null, 2)}

ALL GOALS FOR THIS WEEK UP TO TODAY:
${JSON.stringify(allWeekGoals, null, 2)}

PRECOMPUTED WEEKLY STATS:
${JSON.stringify(stats, null, 2)}

Now generate a manager-grade analysis with:
- employee summary
- weekly goal overview
- today's DSR analysis
- goal-by-goal breakdown
- manager narrative
- percentage of completion of today's DSR based on weekly goals

Return only JSON.
  `.trim();
}
function getManagerGoalAnalysisSchema() {
  return {
    type: "object",
    properties: {
      employeeSummary: {
        type: "object",
        properties: {
          employeeMemberId: { type: "string" },
          departmentId: { type: "string" },
          reportId: { type: "string" },
          weekCycleId: { type: "string" },
          reportDate: { type: "string" }
        },
        required: ["employeeMemberId", "departmentId", "reportId", "weekCycleId", "reportDate"],
        additionalProperties: false
      },
      weeklyGoalOverview: {
        type: "object",
        properties: {
          totalGoals: { type: "number" },
          completedGoals: { type: "number" },
          inProgressGoals: { type: "number" },
          notStartedGoals: { type: "number" },
          blockedGoals: { type: "number" },
          overallCompletionPct: { type: "number" }
        },
        required: [
          "totalGoals",
          "completedGoals",
          "inProgressGoals",
          "notStartedGoals",
          "blockedGoals",
          "overallCompletionPct"
        ],
        additionalProperties: false
      },
      todayDSRAnalysis: {
        type: "object",
        properties: {
          dsrCompletionPct: { type: "number" },
          summary: { type: "string" },
          evidenceStrength: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH"]
          }
        },
        required: ["dsrCompletionPct", "summary", "evidenceStrength"],
        additionalProperties: false
      },
      goalBreakdown: {
        type: "array",
        items: {
          type: "object",
          properties: {
            goalId: { type: "string" },
            title: { type: "string" },
            status: { type: "string" },
            priority: { type: "string" },
            startDate: { type: ["string", "null"] },
            dueDate: { type: ["string", "null"] },
            completionPct: { type: "number" },
            alignmentWithReport: { type: "number" },
            managerSummary: { type: "string" },
            risks: {
              type: "array",
              items: { type: "string" }
            },
            nextSteps: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: [
            "goalId",
            "title",
            "status",
            "priority",
            "startDate",
            "dueDate",
            "completionPct",
            "alignmentWithReport",
            "managerSummary",
            "risks",
            "nextSteps"
          ],
          additionalProperties: false
        }
      },
      managerNarrative: {
        type: "object",
        properties: {
          overallPerformance: { type: "string" },
          accomplishments: {
            type: "array",
            items: { type: "string" }
          },
          concerns: {
            type: "array",
            items: { type: "string" }
          },
          blockers: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          followUpsForManager: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "overallPerformance",
          "accomplishments",
          "concerns",
          "blockers",
          "recommendations",
          "followUpsForManager"
        ],
        additionalProperties: false
      }
    },
    required: [
      "employeeSummary",
      "weeklyGoalOverview",
      "todayDSRAnalysis",
      "goalBreakdown",
      "managerNarrative"
    ],
    additionalProperties: false
  };
}
function buildGoalStats(goals) {
  const totalGoals = goals.length;

  const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
  const inProgressGoals = goals.filter((g) =>
    ["IN_PROGRESS", "ONGOING", "ACTIVE"].includes(g.status)
  ).length;
  const notStartedGoals = goals.filter((g) =>
    ["NOT_STARTED", "PENDING"].includes(g.status)
  ).length;
  const blockedGoals = goals.filter((g) => g.status === "BLOCKED").length;

  const overallCompletionPct = totalGoals
    ? Math.round(
        goals.reduce((acc, goal) => {
          if (typeof goal.managerApprovedProgressPct === "number") {
            return acc + goal.managerApprovedProgressPct;
          }
          if (goal.status === "COMPLETED") return acc + 100;
          if (goal.status === "IN_PROGRESS") return acc + 50;
          return acc + 0;
        }, 0) / totalGoals
      )
    : 0;

  return {
    totalGoals,
    completedGoals,
    inProgressGoals,
    notStartedGoals,
    blockedGoals,
    overallCompletionPct,
  };
}
/**
 * POST /api/ai/report/analyze
 */
export async function analyzeReportAgainstGoalsWithAI({ tenantId, reportId }) {
  const now = new Date();
console.log("Analyzing report", { tenantId, reportId });
  const report = await WorkReport.findOne({
    _id: reportId,
    tenantId: tenantId
  }).lean();

  if (!report) {
    throw ApiError.notFound("Work report not found");
  }

  const linkedGoals = await WorkGoal.find({
    tenantId: tenantId,
    _id: { $in: (report.goalIds ?? []).map((id) => id)},
  }).lean();

  if (!linkedGoals.length) {
    throw ApiError.badRequest("No goals linked to this report");
  }

  const baseGoal = linkedGoals.find((g) => g.weekCycleId) || linkedGoals[0];
  if (!baseGoal?.weekCycleId) {
    throw ApiError.badRequest("Linked goals do not contain weekCycleId");
  }

  const weekCycleId = baseGoal.weekCycleId;

  const allWeekGoals = await WorkGoal.find({
    assignedToMemberId: report.employeeMemberId,
    weekCycleId: weekCycleId, 
  }).lean();
console.log(`Found ${allWeekGoals.length} goals for weekCycleId ${weekCycleId}`);
  const filteredGoals = allWeekGoals.filter((goal) => {
    const startDate = goal?.timeline?.startDate ? new Date(goal.timeline.startDate) : null;
    return !startDate || startDate <= now;
  });

  const stats = buildGoalStats(filteredGoals);

  const prompt = buildManagerGoalAnalysisPrompt({
    report,
    linkedGoals,
    allWeekGoals: filteredGoals,
    stats,
    today: now,
  });

  const schema = getManagerGoalAnalysisSchema();

  const aiResult = await structuredJSONResponse({
    prompt,
    schema,
    timeoutMs: 30000,
  });

  const analysis = aiResult.data;

  await WorkReport.updateOne(
    {
      _id: report._id,
      tenantId: tenantId
    },
    {
      $set: {
        aiAnalysisSnapshot: analysis,
      },
    }
  );

  return {
    reportId: report._id,
    weekCycleId,
    summary: stats,
    analysis,
    usageMetadata: aiResult.usageMetadata,
  };
}

/**
 * GET /api/ai/report/:reportId/analysis
 */
export async function getReportAnalysisController(req, res, next) {
  try {
    const data = await analyzeReportAgainstGoals({
      tenantId: req.tenant.id,
      reportId: req.validated.params.reportId,
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/goals/:goalId/progress-analysis
 */
export async function goalProgressAnalysisController(req, res, next) {
  try {
    const data = await getGoalProgressAnalysis({
      tenantId: req.tenant.id,
      goalId: req.validated.params.goalId,
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/wsr/analysis
 */
export async function wsrAnalysisController(req, res, next) {
  try {
    const data = await getPeriodGoalAnalysis({
      tenantId: req.tenant.id,
      employeeMemberId: req.validated.query.employeeMemberId ?? req.membership?._id,
      periodStart: req.validated.query.periodStart,
      periodEnd: req.validated.query.periodEnd,
      reportType: "WSR",
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

export async function msrAnalysisController(req, res, next) {
  try {
    const data = await getPeriodGoalAnalysis({
      tenantId: req.tenant.id,
      employeeMemberId: req.validated.query.employeeMemberId ?? req.membership?._id,
      periodStart: req.validated.query.periodStart,
      periodEnd: req.validated.query.periodEnd,
      reportType: "MSR",
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

export async function quarterlyAnalysisController(req, res, next) {
  try {
    const data = await getPeriodGoalAnalysis({
      tenantId: req.tenant.id,
      employeeMemberId: req.validated.query.employeeMemberId ?? req.membership?._id,
      periodStart: req.validated.query.periodStart,
      periodEnd: req.validated.query.periodEnd,
      reportType: "QSR",
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

export async function yearlyAnalysisController(req, res, next) {
  try {
    const data = await getPeriodGoalAnalysis({
      tenantId: req.tenant.id,
      employeeMemberId: req.validated.query.employeeMemberId ?? req.membership?._id,
      periodStart: req.validated.query.periodStart,
      periodEnd: req.validated.query.periodEnd,
      reportType: "YSR",
    });
    res.json({ status: "ok", data });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/goals/suggest
 * body: { departmentId, weekCycleId, prompt }
 * Returns AI-generated goal suggestions based on department context
 */
export async function goalSuggestController(req, res, next) {
  try {
    const tenantId = req.tenant?.id ?? req.body.tenantId;
    const { departmentId, weekCycleId, prompt } = req.body;

    if (!prompt || String(prompt).trim().length < 2) {
      return res.status(400).json({ status: "error", message: "prompt is required" });
    }
    if (!tenantId) {
      return res.status(400).json({ status: "error", message: "tenantId is required" });
    }

    // Fetch previous 2 weeks' incomplete goals for context
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const prevFilter = {
      tenantId: new mongoose.Types.ObjectId(String(tenantId)),
      status: { $nin: ["COMPLETED"] },
      createdAt: { $gte: twoWeeksAgo },
    };
    if (departmentId && mongoose.isValidObjectId(String(departmentId))) {
      prevFilter.departmentId = new mongoose.Types.ObjectId(String(departmentId));
    }

    const prevGoals = await WorkGoal.find(prevFilter).sort({ createdAt: -1 }).limit(15).lean();

    // Fetch current week goals for context
    const currentFilter = { tenantId: new mongoose.Types.ObjectId(String(tenantId)) };
    if (weekCycleId && mongoose.isValidObjectId(String(weekCycleId))) {
      currentFilter.weekCycleId = new mongoose.Types.ObjectId(String(weekCycleId));
    }
    if (departmentId && mongoose.isValidObjectId(String(departmentId))) {
      currentFilter.departmentId = new mongoose.Types.ObjectId(String(departmentId));
    }
    const currentGoals = weekCycleId
      ? await WorkGoal.find(currentFilter).limit(20).lean()
      : [];

    const contextSections = [];

    if (prevGoals.length > 0) {
      contextSections.push(
        `PREVIOUS INCOMPLETE GOALS (for context — these may still need work):\n${prevGoals
          .map((g) => `- [${g.status}] ${g.title}${g.description ? ": " + g.description : ""}`)
          .join("\n")}`
      );
    }

    if (currentGoals.length > 0) {
      contextSections.push(
        `CURRENT WEEK GOALS ALREADY PLANNED:\n${currentGoals
          .map((g) => `- [${g.status}] ${g.title}`)
          .join("\n")}`
      );
    }

    const contextBlock = contextSections.length
      ? contextSections.join("\n\n")
      : "No previous goal data available. Generate goals based on best practices.";

    const systemPrompt = `You are an expert work planning AI assistant helping a manager create weekly goals for their department.

${contextBlock}

USER REQUEST: "${prompt.trim()}"

INSTRUCTIONS:
- Generate 3-5 specific, actionable weekly goal suggestions based on the user request.
- Each goal must have a clear title, priority (low/medium/high/critical), optional description, and a suggested weekday.
- Keep goals realistic and achievable in one week.
- ALWAYS populate the "suggestions" array with actual goals — never return an empty array.
- Respond with ONLY a raw JSON object — no markdown, no code fences, no extra text.

REQUIRED JSON FORMAT (respond with exactly this structure):
{
  "message": "A friendly sentence summarizing what you suggest and why.",
  "suggestions": [
    { "title": "Goal title", "description": "Short description", "priority": "high", "suggestedDay": "Monday" },
    { "title": "Another goal", "description": "Short description", "priority": "medium", "suggestedDay": "Wednesday" }
  ]
}`;

    const schema = {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "A friendly, concise AI message explaining the suggestions"
        },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
              suggestedDay: { type: "string", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", ""] }
            },
            required: ["title", "priority"],
            additionalProperties: false
          }
        }
      },
      required: ["message", "suggestions"],
      additionalProperties: false
    };

    const aiResult = await structuredJSONResponse({
      prompt: systemPrompt,
      schema,
      timeoutMs: 30000,
    });

    const responseData = aiResult.data ?? {};

    // Ensure we always have a non-empty suggestions array.
    // If the model returned no suggestions, build rule-based ones from the prompt.
    if (!Array.isArray(responseData.suggestions) || responseData.suggestions.length === 0) {
      const words = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
      responseData.message = responseData.message || `Here are goal suggestions based on: "${words}"`;
      responseData.suggestions = [
        { title: `Plan and start: ${words}`, description: "Break down tasks and start execution.", priority: "high", suggestedDay: "Monday" },
        { title: `Research and document: ${words}`, description: "Gather requirements and document findings.", priority: "medium", suggestedDay: "Tuesday" },
        { title: `Review progress on: ${words}`, description: "Mid-week checkpoint and adjustment.", priority: "medium", suggestedDay: "Wednesday" },
        { title: `Complete deliverables: ${words}`, description: "Finalize and submit key outputs.", priority: "high", suggestedDay: "Friday" },
      ];
    }

    res.json({
      status: "ok",
      data: responseData,
      tokensUsed: aiResult.usageMetadata?.totalTokenCount ?? 0,
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════
// AI TEMPLATE ASSISTANT
// ═══════════════════════════════════════════════════════════════

const TEMPLATE_ASSISTANT_SYSTEM_PROMPT = `You are an expert AI Template Assistant for a B2B workforce management platform. Your job is to help managers create professional report templates through natural conversation.

TEMPLATE TYPES:
- DSR (Daily Status Report): submitted daily by employees tracking tasks, blockers, plans
- WSR (Weekly Status Report): weekly summary with highlights, challenges, next-week plans
- MONTHLY: monthly executive reports with KPIs, risks, executive summary
- QUARTERLY: quarterly reviews with goal progress and next-quarter plans
- YEARLY: annual reports with achievements and outlook
- CUSTOM: any purpose you define

TEMPLATE STRUCTURE (what you must produce when ready):
{
  "name": "Human-readable name",
  "code": "UPPER_SNAKE_CASE_CODE",
  "description": "Purpose of this template",
  "sections": [
    {
      "key": "snake_case_key",
      "title": "Section Display Name",
      "sourceModule": "tasks|goals|reports|integrations",
      "sourceEntity": "Task|WorkGoal|WorkReport|IntegrationResource",
      "sourceLimit": 20,
      "columns": [
        { "key": "camelCaseKey", "label": "Column Label", "type": "text|number|currency|percent|date|datetime|badge" }
      ]
    }
  ],
  "customFields": [
    {
      "key": "snake_case_key",
      "label": "Field Label",
      "type": "text|longText|number|date",
      "required": true,
      "placeholder": "Helpful placeholder text"
    }
  ]
}

COLUMN TYPES:
- text: names, titles, descriptions
- badge: status values (todo/in-progress/done), priority (low/medium/high/critical)
- date: due dates, completion dates
- datetime: timestamps
- number: counts, hours, scores
- percent: progress percentages (0-100)
- currency: money values

QUALITY RULES:
- Always include at least 1 section with 3-5 columns
- Always include at least 2 custom fields
- DSR must include: summary (longText, required), blockers (longText), plans_tomorrow (longText)
- WSR must include: highlights (longText, required), challenges (longText), next_week (longText)
- Section keys and custom field keys must be unique and snake_case
- Column keys must be camelCase
- Columns should use the most appropriate type (status → badge, date → date, count → number)

CONVERSATION STRATEGY:
1. First message: Welcome the user, briefly explain what you'll help with, then ask 2-3 SPECIFIC questions:
   - What team/department is this for? (Engineering, HR, Sales, etc.)
   - What are the most important things they want to track?
   - Any special fields or sections they need?
2. After first user response: If you have enough info, generate the full template immediately. If unclear, ask ONE more clarifying question.
3. For change requests ("add X", "remove Y", "make Z required"): apply the change and return the updated full template.
4. Be helpful and proactive — suggest useful additions they might not have thought of.

RESPONSE FORMAT (ALWAYS return this exact JSON structure):
{
  "message": "Your conversational reply (use markdown for readability)",
  "hasTemplate": false,
  "template": null
}

When you have generated a template, return:
{
  "message": "Here's your template! [describe what you built]. You can click 'Apply to Form' to load it, then customize further.",
  "hasTemplate": true,
  "template": { ...full template object... }
}`;

const templateAssistantInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).min(1).max(30),
  reportType: z.string().min(1),
  currentTemplate: z.record(z.unknown()).optional(),
});

/**
 * POST /api/ai/template-assistant
 * Conversational AI that helps build report templates step-by-step.
 * Supports multi-turn chat: ask questions → generate template → iterate.
 */
export async function templateAssistantController(req, res, next) {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant?.id || req.body?.tenantId;

    if (!userId) return next(ApiError.unauthorized("Authentication required"));
    if (!tenantId) return next(ApiError.badRequest("tenantId is required"));

    const parsed = templateAssistantInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiError.badRequest("Invalid request: " + parsed.error.issues.map((i) => i.message).join(", ")));
    }

    const { messages, reportType, currentTemplate } = parsed.data;

    // Build the conversation for the AI
    const systemContent = TEMPLATE_ASSISTANT_SYSTEM_PROMPT
      .replace("{reportType}", reportType)
      + (currentTemplate ? `\n\nCurrent template state (for edits):\n${JSON.stringify(currentTemplate, null, 2)}` : "");

    const conversationMessages = [
      { role: "system", content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let client;
    try {
      const { createOpenAIClient } = await import("./ai.openai.js");
      client = createOpenAIClient();
    } catch (err) {
      return res.json({
        message: "The AI service is not configured yet. Please set OPENAI_API_KEY in your backend .env file.",
        hasTemplate: false,
        template: null,
      });
    }

    const aiModel = config.ai?.model || OPENAI_MODEL;

    const response = await client.chat.completions.create({
      model: aiModel,
      messages: conversationMessages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3000,
    }).catch(async (err) => {
      // Fallback: try without json_object format (some providers don't support it)
      if (err?.status === 400 || err?.code === "invalid_request_error") {
        const fallbackMessages = [
          {
            role: "system",
            content: systemContent + "\n\nIMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.",
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];
        return client.chat.completions.create({
          model: aiModel,
          messages: fallbackMessages,
          temperature: 0.7,
          max_tokens: 3000,
        });
      }
      throw err;
    });

    const rawText = response?.choices?.[0]?.message?.content ?? "";

    // Parse the JSON response
    let parsed2;
    try {
      parsed2 = JSON.parse(rawText);
    } catch {
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          parsed2 = JSON.parse(rawText.slice(start, end + 1));
        } catch {
          parsed2 = null;
        }
      }
    }

    const aiMessage = (parsed2?.message ?? rawText.slice(0, 500)) || "I'm ready to help you build a great template! Tell me about your team and what you want to track.";
    const hasTemplate = Boolean(parsed2?.hasTemplate && parsed2?.template);
    const template = hasTemplate ? parsed2.template : null;

    logger.info({ tenantId, reportType, hasTemplate, turns: messages.length }, "Template assistant response");

    return res.json({ message: aiMessage, hasTemplate, template });
  } catch (err) {
    logger.error({ err }, "templateAssistantController error");
    return res.json({
      message: "I encountered an issue. Please try rephrasing your message or try again.",
      hasTemplate: false,
      template: null,
    });
  }
}
