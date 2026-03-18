import mongoose from "mongoose";
import { ApiError } from "#api/utils/ApiError.js";
import { GoalProgressHistory, ReportGoalAnalysis, WeekCycle, WorkGoal, WorkReport } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

/** Safely convert a Date object or ISO string to "YYYY-MM-DD" */
const toDateStr = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

const toText = (content) => {
  if (!content) return "";
  if (typeof content === "string") return content;
  return JSON.stringify(content);
};

const normalizeWords = (text) => {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
};

const computeMatchScore = (reportContent, goal) => {
  const reportWords = new Set(normalizeWords(toText(reportContent)));
  const goalWords = normalizeWords(`${goal.title || ""} ${goal.description || ""}`);
  if (!goalWords.length) return 0;

  let matches = 0;
  for (const word of goalWords) {
    if (reportWords.has(word)) matches += 1;
  }
  return Number((matches / goalWords.length).toFixed(2));
};

const getWeekBounds = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/** Map a goal status to a human-readable label */
function statusLabel(status) {
  const map = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    BLOCKED: "Blocked",
    UNDER_REVIEW: "Under Review",
    COMPLETED: "Completed",
    CARRIED_FORWARD: "Carried Forward",
  };
  return map[status] ?? status ?? "Not Started";
}

/**
 * Build a deterministic DSR suggestion from real goal data.
 * NO LLM calls — all results are derived from actual goal statuses,
 * progress percentages, remarks, and progress history entries.
 */
export async function getDSRSuggestions({ tenantId, userId, employeeMemberId, date = new Date() }) {
  const targetDate = new Date(date);
  const targetDateStr = targetDate.toISOString().slice(0, 10);
  const tomorrowStr = new Date(targetDate.getTime() + 86400000).toISOString().slice(0, 10);
  const { start, end } = getWeekBounds(targetDate);

  // ── 1. Find the week cycle for this date ────────────────────────────────────
  const cycle = await WeekCycle.findOne({
    tenantId: toObjectId(tenantId),
    employeeMemberId: toObjectId(employeeMemberId),
    weekStartDate: { $lte: targetDate },
    weekEndDate: { $gte: targetDate },
  }).lean();

  // ── 2. Fetch all goals for this week ────────────────────────────────────────
  const filter = {
    tenantId: toObjectId(tenantId),
    assignedToMemberId: toObjectId(employeeMemberId),
  };
  if (cycle?._id) {
    filter.weekCycleId = cycle._id;
  } else {
    filter["timeline.startDate"] = { $gte: start };
    filter["timeline.dueDate"] = { $lte: end };
  }

  const goals = await WorkGoal.find(filter).sort({ "timeline.dueDate": 1, createdAt: 1 }).lean();

  // ── 3. Fetch progress history entries recorded today ─────────────────────────
  const todayStart = new Date(targetDateStr + "T00:00:00.000Z");
  const todayEnd = new Date(targetDateStr + "T23:59:59.999Z");
  const progressHistory = goals.length
    ? await GoalProgressHistory.find({
        tenantId: toObjectId(tenantId),
        goalId: { $in: goals.map((g) => g._id) },
        $or: [
          { updatedAt: { $gte: todayStart, $lte: todayEnd } },
          { createdAt: { $gte: todayStart, $lte: todayEnd } },
        ],
      }).lean()
    : [];

  // Index: goalId → most recent history entry for today
  const historyByGoalId = {};
  for (const h of progressHistory) {
    const key = String(h.goalId);
    if (!historyByGoalId[key]) historyByGoalId[key] = h;
  }

  // ── 4. Classify goals ───────────────────────────────────────────────────────
  const todayGoals = goals.filter(
    (g) => toDateStr(g.timeline?.dueDate) === targetDateStr ||
           toDateStr(g.timeline?.startDate) === targetDateStr
  );
  const overdueGoals = goals.filter((g) => {
    const due = toDateStr(g.timeline?.dueDate);
    return due && due < targetDateStr && !["COMPLETED", "CARRIED_FORWARD"].includes(g.status);
  });
  const completedToday = goals.filter(
    (g) => g.status === "COMPLETED" && toDateStr(g.timeline?.dueDate) === targetDateStr
  );
  const blockedGoals = goals.filter((g) => g.status === "BLOCKED");
  const tomorrowGoals = goals.filter(
    (g) => toDateStr(g.timeline?.dueDate) === tomorrowStr && g.status !== "COMPLETED"
  );
  const inProgressGoals = goals.filter(
    (g) => g.status === "IN_PROGRESS" && !todayGoals.some((t) => String(t._id) === String(g._id))
  );

  // ── 5. Build structured tasks (one per today's goal) ───────────────────────
  // These map 1-to-1 with the goal rows in the DSR form.
  const tasks = todayGoals.map((goal) => {
    const history = historyByGoalId[String(goal._id)];
    const progressPct = goal.progress?.selfReportedPct ?? goal.progress?.managerApprovedPct ?? 0;
    const note = history?.notes || goal.remarks || "";
    return {
      goalId: String(goal._id),
      goalTitle: goal.title ?? "Untitled Goal",
      status: goal.status ?? "NOT_STARTED",
      progressPct,
      notes: note,
    };
  });

  // ── 6. Build achievement strings (deterministic from real data) ─────────────
  const achievements = [];

  for (const goal of todayGoals) {
    const history = historyByGoalId[String(goal._id)];
    const progressPct = goal.progress?.selfReportedPct ?? goal.progress?.managerApprovedPct ?? 0;
    const note = history?.notes || goal.remarks || "";

    let line = goal.title ?? "Goal";
    if (goal.status === "COMPLETED") {
      line += " — Completed ✓";
    } else if (goal.status === "IN_PROGRESS") {
      line += ` — In Progress (${progressPct}%)`;
    } else if (goal.status === "BLOCKED") {
      line += " — Blocked";
    } else if (progressPct > 0) {
      line += ` — ${progressPct}% progress`;
    } else {
      line += ` — ${statusLabel(goal.status)}`;
    }

    if (note) line += `. ${note}`;
    achievements.push(line);
  }

  // Add any in-progress goals from earlier in the week that got progress today
  for (const goal of inProgressGoals) {
    const history = historyByGoalId[String(goal._id)];
    if (!history) continue; // only include if actual progress was recorded today
    const progressPct = goal.progress?.selfReportedPct ?? goal.progress?.managerApprovedPct ?? 0;
    const note = history?.notes || goal.remarks || "";
    let line = `${goal.title} — In Progress (${progressPct}%)`;
    if (note) line += `. ${note}`;
    achievements.push(line);
  }

  // ── 7. Build challenges from blocked + overdue goals ────────────────────────
  const challenges = [];

  for (const goal of blockedGoals) {
    const note = goal.remarks || "";
    let line = `Blocked: ${goal.title}`;
    if (note) line += ` — ${note}`;
    challenges.push(line);
  }

  for (const goal of overdueGoals.filter((g) => g.status !== "BLOCKED")) {
    const due = toDateStr(goal.timeline?.dueDate) ?? "";
    challenges.push(`Pending from ${due}: ${goal.title} (${statusLabel(goal.status)})`);
  }

  // ── 8. Build plans from tomorrow's goals + in-progress carryovers ──────────
  const plans = [];

  for (const goal of tomorrowGoals) {
    plans.push(goal.title ?? "");
  }

  // Carry in-progress goals that have no tomorrow due date
  for (const goal of inProgressGoals.filter(
    (g) => toDateStr(g.timeline?.dueDate) !== tomorrowStr
  )) {
    plans.push(`Continue: ${goal.title}`);
  }

  // ── 9. Return structured, deterministic response ────────────────────────────
  return {
    weekCycleId: cycle?._id ?? null,
    date: targetDate,
    tasks, // structured list for the frontend to use directly
    achievements,
    challenges,
    plans,
    todayFocusGoal: todayGoals[0]
      ? {
          goalId: todayGoals[0]._id,
          title: todayGoals[0].title,
          dueDate: todayGoals[0].timeline?.dueDate,
          status: todayGoals[0].status,
        }
      : null,
    pendingFromEarlier: overdueGoals.map((goal) => ({
      goalId: goal._id,
      title: goal.title,
      dueDate: goal.timeline?.dueDate,
      status: goal.status,
      progressPct: goal.progress?.selfReportedPct ?? goal.progress?.managerApprovedPct ?? 0,
      isCarriedForward: goal.isCarriedForward ?? false,
    })),
    estimatedProgress: goals.map((goal) => ({
      goalId: goal._id,
      title: goal.title,
      estimatedProgressPct: goal.progress?.selfReportedPct ?? goal.progress?.managerApprovedPct ?? 0,
      managerApprovedProgressPct: goal.progress?.managerApprovedPct ?? 0,
      status: goal.status,
    })),
    recommendedPoints: plans,
    aiAugmentation: null,
  };
}

export async function analyzeReportAgainstGoals({ tenantId, reportId }) {
  const report = await WorkReport.findOne({
    _id: toObjectId(reportId),
    tenantId: toObjectId(tenantId),
  }).lean();
  if (!report) throw ApiError.notFound("Work report not found");

  const goals = await WorkGoal.find({
    tenantId: toObjectId(tenantId),
    _id: { $in: report.goalIds ?? [] },
  }).lean();

  const analyses = [];
  for (const goal of goals) {
    const matchScore = computeMatchScore(report.content, goal);
    const baseline = goal.progress?.managerApprovedPct ?? 0;
    const aiEstimatedCompletionPct = Math.min(100, Math.max(baseline, Math.round(matchScore * 100)));

    const pendingWork = [];
    if (aiEstimatedCompletionPct < 100) pendingWork.push(`Remaining work on goal \"${goal.title}\"`);
    if (goal.status === "BLOCKED") pendingWork.push("Goal is currently blocked");

    const missingExpectedUpdates = [];
    if (matchScore < 0.35) missingExpectedUpdates.push("Report has weak evidence for this goal");

    const recommendedAdditionalWork = [];
    if (aiEstimatedCompletionPct < 100) {
      recommendedAdditionalWork.push("Add measurable updates for completed parts");
      recommendedAdditionalWork.push("List pending sub-steps and ETA in next report");
    }

    const saved = await ReportGoalAnalysis.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), reportId: report._id, goalId: goal._id },
      {
        $set: {
          matchScore,
          aiEstimatedCompletionPct,
          pendingWork,
          missingExpectedUpdates,
          recommendedAdditionalWork,
          generatedAt: new Date(),
          modelMeta: { strategy: "heuristic-keyword-overlap-v1" },
        },
      },
      { new: true, upsert: true }
    ).lean();

    analyses.push(saved);
  }

  const summary = {
    totalGoals: goals.length,
    avgMatchScore: goals.length ? Number((analyses.reduce((acc, a) => acc + (a.matchScore || 0), 0) / goals.length).toFixed(2)) : 0,
    avgEstimatedCompletionPct: goals.length
      ? Math.round(analyses.reduce((acc, a) => acc + (a.aiEstimatedCompletionPct || 0), 0) / goals.length)
      : 0,
    pendingGoalCount: analyses.filter((a) => (a.aiEstimatedCompletionPct ?? 0) < 100).length,
  };

  return { reportId: report._id, summary, analyses };
}

export async function getPeriodGoalAnalysis({ tenantId, employeeMemberId, periodStart, periodEnd, reportType }) {
  const reports = await WorkReport.find({
    tenantId: toObjectId(tenantId),
    employeeMemberId: toObjectId(employeeMemberId),
    reportType,
    "period.startDate": { $gte: periodStart },
    "period.endDate": { $lte: periodEnd },
  }).lean();

  const reportIds = reports.map((report) => report._id);
  const analyses = reportIds.length
    ? await ReportGoalAnalysis.find({
        tenantId: toObjectId(tenantId),
        reportId: { $in: reportIds },
      }).lean()
    : [];

  const goalMap = new Map();
  for (const item of analyses) {
    const key = String(item.goalId);
    const current = goalMap.get(key) || {
      goalId: item.goalId,
      analysisCount: 0,
      totalEstimatedCompletionPct: 0,
      totalMatchScore: 0,
    };
    current.analysisCount += 1;
    current.totalEstimatedCompletionPct += item.aiEstimatedCompletionPct ?? 0;
    current.totalMatchScore += item.matchScore ?? 0;
    goalMap.set(key, current);
  }

  const goalSummaries = Array.from(goalMap.values()).map((goal) => ({
    goalId: goal.goalId,
    completionPct: Math.round(goal.totalEstimatedCompletionPct / goal.analysisCount),
    matchScore: Number((goal.totalMatchScore / goal.analysisCount).toFixed(2)),
  }));

  return {
    reportType,
    period: { startDate: periodStart, endDate: periodEnd },
    reportCount: reports.length,
    approvedReportCount: reports.filter((report) => report.status === "APPROVED").length,
    goalSummaries,
    completedGoals: goalSummaries.filter((goal) => goal.completionPct >= 100).length,
    incompleteGoals: goalSummaries.filter((goal) => goal.completionPct < 100).length,
    reports,
  };
}

export async function getGoalProgressAnalysis({ tenantId, goalId }) {
  const goal = await WorkGoal.findOne({
    tenantId: toObjectId(tenantId),
    _id: toObjectId(goalId),
  }).lean();
  if (!goal) throw ApiError.notFound("Work goal not found");

  const analyses = await ReportGoalAnalysis.find({
    tenantId: toObjectId(tenantId),
    goalId: toObjectId(goalId),
  })
    .sort({ generatedAt: -1 })
    .limit(20)
    .lean();

  const history = await GoalProgressHistory.find({
    tenantId: toObjectId(tenantId),
    goalId: toObjectId(goalId),
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const avgEstimatedCompletionPct = analyses.length
    ? Math.round(analyses.reduce((acc, item) => acc + (item.aiEstimatedCompletionPct ?? 0), 0) / analyses.length)
    : 0;

  return {
    goalId,
    goalTitle: goal.title,
    status: goal.status,
    managerApprovedProgressPct: goal.progress?.managerApprovedPct ?? 0,
    avgEstimatedCompletionPct,
    recentAnalyses: analyses,
    progressHistory: history,
  };
}
