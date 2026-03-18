import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { structuredJSONResponse } from "./ai.openai.js";
import { WorkGoal } from "#db/models/index.js";
import { WorkReport } from "#db/models/index.js";
import { WeekCycle } from "#db/models/index.js";


const { Types } = mongoose;


export function toObjectId(value, fieldName = "id") {
  if (!value) {
    throw ApiError.badRequest(`${fieldName} is required`);
  }

  // If populated document or object with _id
  const raw = typeof value === "object" && value._id ? value._id : value;

  // If already ObjectId
  if (raw instanceof Types.ObjectId) {
    return raw;
  }

  // Validate string
  if (typeof raw === "string" && Types.ObjectId.isValid(raw)) {
    return new Types.ObjectId(raw);
  }

  throw ApiError.badRequest(`${fieldName} must be a valid ObjectId`);
}

async function getReportOrThrow({ tenantId, reportId }) {
  const report = await WorkReport.findOne({
    _id: reportId,
    tenantId: tenantId
  }).lean();

  if (!report) {
    throw ApiError.notFound("Work report not found");
  }

  return report;
}

async function getLinkedGoalsOrThrow({ tenantId, report }) {
  const goalIds = (report.goalIds ?? []).filter(Boolean);

  if (!goalIds.length) {
    throw ApiError.badRequest("No goals linked to this report");
  }

  const goals = await WorkGoal.find({
    tenantId: tenantId,
    _id: { $in: goalIds.map((id) => id) },
  }).lean();

  if (!goals.length) {
    throw ApiError.badRequest("Linked goals not found");
  }

  return goals;
}

function inferCycleKeyFromGoal(goal) {
  if (goal.weekCycleId) return { key: "weekCycleId", value: goal.weekCycleId };
  if (goal.monthCycleId) return { key: "monthCycleId", value: goal.monthCycleId };
  if (goal.quarterCycleId) return { key: "quarterCycleId", value: goal.quarterCycleId };
  if (goal.yearCycleId) return { key: "yearCycleId", value: goal.yearCycleId };
  return null;
}

function getReportTypeInstructions(reportType) {
  switch (reportType) {
    case "DSR":
      return `
Focus on today's work and how it contributes to weekly goals up to today.
Compare today's reported work against today's expected progress.
Estimate today's report contribution percentage and each goal's current completion percentage.
`;
    case "WSR":
      return `
Focus on cumulative weekly progress.
Compare the report against all goals for the active week and estimate each goal's completion percentage.
`;
    case "MSR":
      return `
Focus on cumulative monthly progress.
Compare the report against all goals relevant to the active month and estimate monthly contribution and goal completion.
`;
    case "QSR":
      return `
Focus on cumulative quarterly progress and strategic delivery.
Compare the report against all quarter goals and estimate overall report contribution and goal completion.
`;
    case "YSR":
      return `
Focus on cumulative yearly progress and strategic outcomes.
Compare the report against yearly goals and estimate long-term progress and contribution.
`;
    default:
      return `
Compare the report with the relevant goals for the report period and estimate contribution and completion percentages.
`;
  }
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

  const overallGoalCompletionPct = totalGoals
    ? Math.round(
        goals.reduce((acc, goal) => {
          if (typeof goal.managerApprovedProgressPct === "number") {
            return acc + goal.managerApprovedProgressPct;
          }
          if (goal.status === "COMPLETED") return acc + 100;
          if (["IN_PROGRESS", "ONGOING", "ACTIVE"].includes(goal.status)) return acc + 50;
          return acc;
        }, 0) / totalGoals
      )
    : 0;

  return {
    totalGoals,
    completedGoals,
    inProgressGoals,
    notStartedGoals,
    blockedGoals,
    overallGoalCompletionPct,
  };
}

function filterGoalsTillToday(goals, now) {
  return goals.filter((goal) => {
    const startDate = goal?.timeline?.startDate ? new Date(goal.timeline.startDate) : null;
    return !startDate || startDate <= now;
  });
}

async function buildAnalysisContextByReportType({ tenantId, report, linkedGoals }) {
  const now = new Date();

  const baseGoal = linkedGoals[0];
  const cycle = inferCycleKeyFromGoal(baseGoal);

  if (!cycle) {
    throw ApiError.badRequest("Linked goals do not contain a valid cycle reference");
  }

  const query = {
    tenantId: tenantId,
    employeeMemberId: report.employeeMemberId,
    [cycle.key]: toObjectId(cycle.value, cycle.key),
  };

  const scopedGoalsRaw = await WorkGoal.find(query).lean();
  const scopedGoals = filterGoalsTillToday(scopedGoalsRaw, now);
  const aggregateStats = buildGoalStats(scopedGoals);

  return {
    now,
    cycleKey: cycle.key,
    cycleId: String(cycle.value?._id || cycle.value),
    report,
    linkedGoals,
    scopedGoals,
    aggregateStats,
    reportTypeInstructions: getReportTypeInstructions(report.reportType),
  };
}

function getEnterpriseAnalysisSchema() {
  return {
    type: "object",
    properties: {
      employeeSummary: {
        type: "object",
        properties: {
          employeeMemberId: { type: "string" },
          departmentId: { type: "string" },
          reportId: { type: "string" },
          reportType: { type: "string" },
          periodStartDate: { type: "string" },
          periodEndDate: { type: "string" }
        },
        required: [
          "employeeMemberId",
          "departmentId",
          "reportId",
          "reportType",
          "periodStartDate",
          "periodEndDate"
        ],
        additionalProperties: false
      },
      reportEvaluation: {
        type: "object",
        properties: {
          reportContributionPct: { type: "number" },
          evidenceStrength: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          summary: { type: "string" },
          keyEvidence: {
            type: "array",
            items: { type: "string" }
          },
          missingEvidence: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "reportContributionPct",
          "evidenceStrength",
          "summary",
          "keyEvidence",
          "missingEvidence"
        ],
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
            goalCompletionPct: { type: "number" },
            reportContributionToGoalPct: { type: "number" },
            evidenceSummary: { type: "string" },
            matchedReportSections: {
              type: "array",
              items: { type: "string" }
            },
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
            "goalCompletionPct",
            "reportContributionToGoalPct",
            "evidenceSummary",
            "matchedReportSections",
            "risks",
            "nextSteps"
          ],
          additionalProperties: false
        }
      },
      aggregateGoalStatus: {
        type: "object",
        properties: {
          totalGoals: { type: "number" },
          completedGoals: { type: "number" },
          inProgressGoals: { type: "number" },
          notStartedGoals: { type: "number" },
          blockedGoals: { type: "number" },
          overallGoalCompletionPct: { type: "number" }
        },
        required: [
          "totalGoals",
          "completedGoals",
          "inProgressGoals",
          "notStartedGoals",
          "blockedGoals",
          "overallGoalCompletionPct"
        ],
        additionalProperties: false
      },
      managerNarrative: {
        type: "object",
        properties: {
          overallPerformance: { type: "string" },
          accomplishments: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          blockers: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          followUpsForManager: { type: "array", items: { type: "string" } }
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
      "reportEvaluation",
      "goalBreakdown",
      "aggregateGoalStatus",
      "managerNarrative"
    ],
    additionalProperties: false
  };
}

function buildEnterpriseAnalysisPrompt({
  report,
  linkedGoals,
  scopedGoals,
  aggregateStats,
  currentDate,
  reportTypeInstructions,
}) {
  return `
You are an enterprise-grade employee performance analyst.

Your task is to evaluate a work report against the employee's relevant goals and produce a manager-ready analysis.

You must:
1. Compare the report content against each relevant goal.
2. Estimate how much this report contributes to each goal.
3. Estimate the completion percentage of each goal as of this report.
4. Estimate the completion percentage of this report itself against the relevant goals.
5. Identify evidence, missing evidence, blockers, risks, and next steps.
6. Produce a professional, manager-facing narrative.

STRICT RULES:
- Return ONLY valid JSON.
- Do not include markdown.
- Do not invent facts.
- Use only the supplied report and goals.
- Compare report content, section data, remarks, metrics, and narrative against goal intent and goal status.
- If evidence is weak, state that clearly.
- If a goal is completed, reflect that strongly.
- If a goal is not started, pending, or blocked and the report provides little or no supporting evidence, mention that clearly.
- goalCompletionPct = estimated total completion of that goal as of now.
- reportContributionToGoalPct = how much this specific report contributes toward that goal.
- reportContributionPct = how much this report overall contributes toward the currently relevant goals.
- For DSR, pay special attention to today's contribution and today-relevant progress.

REPORT-TYPE SPECIFIC RULES:
${reportTypeInstructions}

CURRENT DATE:
${currentDate.toISOString()}

WORK REPORT:
${JSON.stringify(report, null, 2)}

GOALS LINKED DIRECTLY TO THE REPORT:
${JSON.stringify(linkedGoals, null, 2)}

SCOPED GOALS FOR ANALYSIS:
${JSON.stringify(scopedGoals, null, 2)}

AGGREGATE GOAL STATS:
${JSON.stringify(aggregateStats, null, 2)}

Return JSON with:
- employeeSummary
- reportEvaluation
- goalBreakdown
- aggregateGoalStatus
- managerNarrative
  `.trim();
}

export async function analyzeWorkReportWithAI({ tenantId, reportId }) {
  const report = await getReportOrThrow({ tenantId, reportId });
  const linkedGoals = await getLinkedGoalsOrThrow({ tenantId, report });

  const context = await buildAnalysisContextByReportType({
    tenantId,
    report,
    linkedGoals,
  });

  const prompt = buildEnterpriseAnalysisPrompt({
    report: context.report,
    linkedGoals: context.linkedGoals,
    scopedGoals: context.scopedGoals,
    aggregateStats: context.aggregateStats,
    currentDate: context.now,
    reportTypeInstructions: context.reportTypeInstructions,
  });

  const schema = getEnterpriseAnalysisSchema();

  const aiResult = await structuredJSONResponse({
    prompt,
    schema,
    timeoutMs: 30000,
  });

  await WorkReport.updateOne(
    {
      _id: toObjectId(report._id, "reportId"),
      tenantId: tenantId
    },
    {
      $set: {
        aiAnalysisSnapshot: aiResult.data,
      },
    }
  );

  return {
    reportId: String(report._id),
    reportType: report.reportType,
    cycleKey: context.cycleKey,
    cycleId: context.cycleId,
    analysis: aiResult.data,
    usageMetadata: aiResult.usageMetadata,
  };
}