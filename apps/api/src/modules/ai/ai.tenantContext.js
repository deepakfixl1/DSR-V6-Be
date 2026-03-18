/**
 * ai.tenantContext.js
 * Fetches a comprehensive, role-aware tenant snapshot for the AI assistant.
 * All queries run in parallel; failures are silently suppressed so a single
 * unavailable collection never breaks the chat.
 */

import mongoose from "mongoose";
import {
  Tenant,
  TenantMembership,
  Department,
  WorkGoal,
  WorkReport,
  Blocker,
  WeekCycle,
  Subscription,
  ReportApproval,
  Notification,
} from "#db/models/index.js";

const oid = (v) => new mongoose.Types.ObjectId(v);
const safe = (r) => (r.status === "fulfilled" ? r.value : null);

/**
 * Fetch all data the AI needs for a given tenant + user.
 * Returns a plain object — never throws.
 */
export async function loadTenantContext({ tenantId, userId }) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    tenantResult,
    membershipResult,
    departmentsResult,
    membersResult,
    weekCyclesResult,
    goalsResult,
    blockersResult,
    reportsResult,
    pendingApprovalsResult,
    subscriptionResult,
    notificationsResult,
  ] = await Promise.allSettled([
    // 1. Tenant + plan
    Tenant.findById(tenantId)
      .populate("planId", "name planCode limits features")
      .lean(),

    // 2. Requesting user's membership, role, department
    TenantMembership.findOne({
      tenantId: oid(tenantId),
      userId: oid(userId),
      status: "active",
    })
      .populate("roleId", "name permissions")
      .populate("departmentId", "name slug")
      .lean(),

    // 3. All departments with manager
    Department.find({ tenantId: oid(tenantId), deletedAt: null })
      .populate({ path: "managerId", populate: { path: "userId", select: "name email" } })
      .limit(30)
      .lean(),

    // 4. Active team members
    TenantMembership.find({ tenantId: oid(tenantId), status: "active" })
      .populate("userId", "name email")
      .populate("roleId", "name")
      .populate("departmentId", "name")
      .limit(60)
      .lean(),

    // 5. Last 2 week cycles (most recent first)
    WeekCycle.find({ tenantId: oid(tenantId) })
      .sort({ weekStartDate: -1 })
      .limit(2)
      .lean(),

    // 6. Goals — current week + last 7 days
    WorkGoal.find({
      tenantId: oid(tenantId),
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate("assignedToMemberId", "userId")
      .populate("departmentId", "name")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),

    // 7. Open / escalated blockers
    Blocker.find({
      tenantId: oid(tenantId),
      status: { $in: ["open", "in_progress", "escalated"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

    // 8. Recent work reports (last 7 days)
    WorkReport.find({
      tenantId: oid(tenantId),
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),

    // 9. Pending approvals
    ReportApproval.find({
      tenantId: oid(tenantId),
      status: "pending",
    })
      .limit(10)
      .lean(),

    // 10. Subscription + plan limits
    Subscription.findOne({ tenantId: oid(tenantId) })
      .populate("planId", "name planCode limits features")
      .lean(),

    // 11. Recent unread notifications for user
    Notification.find({
      tenantId: oid(tenantId),
      userId: oid(userId),
      readAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const goals = safe(goalsResult) ?? [];
  const goalStats = {
    total: goals.length,
    completed: goals.filter((g) => g.status === "COMPLETED").length,
    inProgress: goals.filter((g) => g.status === "IN_PROGRESS").length,
    notStarted: goals.filter((g) => g.status === "NOT_STARTED").length,
    blocked: goals.filter((g) => g.status === "BLOCKED").length,
    underReview: goals.filter((g) => g.status === "UNDER_REVIEW").length,
    carriedForward: goals.filter((g) => g.status === "CARRIED_FORWARD").length,
    pendingApproval: goals.filter((g) => g.approval?.status === "PENDING").length,
    avgProgress: goals.length
      ? Math.round(
          goals.reduce((s, g) => s + (g.progress?.managerApprovedPct ?? 0), 0) /
            goals.length
        )
      : 0,
  };

  const blockers = safe(blockersResult) ?? [];
  const blockerStats = {
    total: blockers.length,
    critical: blockers.filter((b) => b.severity === "critical").length,
    escalated: blockers.filter((b) => b.status === "escalated").length,
    slaBreached: blockers.filter((b) => b.SLA?.breached).length,
  };

  const reports = safe(reportsResult) ?? [];
  const reportStats = {
    total: reports.length,
    submitted: reports.filter((r) => r.status === "SUBMITTED").length,
    approved: reports.filter((r) => r.status === "APPROVED").length,
    draft: reports.filter((r) => r.status === "DRAFT").length,
    rejected: reports.filter((r) => r.status === "REJECTED").length,
    lateSubmissions: reports.filter((r) => r.isLate).length,
  };

  const members = safe(membersResult) ?? [];
  const membership = safe(membershipResult);

  return {
    tenant: safe(tenantResult),
    currentUser: {
      membershipId: membership?._id,
      role: membership?.roleId?.name ?? "unknown",
      permissions: membership?.roleId?.permissions ?? [],
      isOwner: membership?.isOwner ?? false,
      department: membership?.departmentId?.name ?? null,
      departmentId: membership?.departmentId?._id ?? null,
    },
    plan: {
      name: safe(subscriptionResult)?.planId?.name ?? "Free",
      limits: safe(subscriptionResult)?.planId?.limits ?? {},
      features: safe(subscriptionResult)?.planId?.features ?? {},
      status: safe(subscriptionResult)?.status ?? null,
    },
    organization: {
      totalMembers: members.length,
      departments: (safe(departmentsResult) ?? []).map((d) => ({
        id: d._id,
        name: d.name,
        slug: d.slug,
        manager: d.managerId?.userId?.name ?? null,
      })),
      members: members.slice(0, 30).map((m) => ({
        name: m.userId?.name ?? m.userId?.email ?? "Unknown",
        role: m.roleId?.name ?? "unknown",
        department: m.departmentId?.name ?? null,
        isOwner: m.isOwner ?? false,
        status: m.status,
      })),
    },
    weekCycles: (safe(weekCyclesResult) ?? []).map((wc) => ({
      id: wc._id,
      period: `${new Date(wc.weekStartDate).toLocaleDateString()} – ${new Date(wc.weekEndDate).toLocaleDateString()}`,
      status: wc.status,
      approvalStatus: wc.approvalStatus,
      summary: wc.summary,
    })),
    goals: {
      stats: goalStats,
      items: goals.slice(0, 25).map((g) => ({
        title: g.title,
        status: g.status,
        priority: g.priority,
        category: g.category,
        progress: g.progress?.managerApprovedPct ?? 0,
        approvalStatus: g.approval?.status,
        department: g.departmentId?.name ?? null,
        dueDate: g.timeline?.dueDate
          ? new Date(g.timeline.dueDate).toLocaleDateString()
          : null,
      })),
    },
    blockers: {
      stats: blockerStats,
      items: blockers.slice(0, 15).map((b) => ({
        title: b.title,
        severity: b.severity,
        status: b.status,
        type: b.type,
        slaBreached: b.SLA?.breached ?? false,
      })),
    },
    reports: {
      stats: reportStats,
      recent: reports.slice(0, 10).map((r) => ({
        type: r.reportType,
        status: r.status,
        isLate: r.isLate,
        submittedAt: r.submittedAt
          ? new Date(r.submittedAt).toLocaleDateString()
          : null,
      })),
    },
    pendingApprovals: (safe(pendingApprovalsResult) ?? []).length,
    notifications: (safe(notificationsResult) ?? []).slice(0, 5).map((n) => ({
      type: n.type,
      message: n.message ?? n.title,
      createdAt: n.createdAt,
    })),
    fetchedAt: now.toISOString(),
  };
}

/**
 * Build the full system prompt for the AI assistant.
 * Role-aware: owners/admins see everything, others see their scope.
 */
export function buildAssistantPrompt({ context, userQuery, conversationHistory = [] }) {
  const { tenant, currentUser, organization, weekCycles, goals, blockers, reports, plan, pendingApprovals, notifications } = context;

  const isAdminLevel =
    currentUser.isOwner ||
    ["tenant_admin", "admin", "manager"].includes(currentUser.role);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentCycle = weekCycles[0] ?? null;

  const historyBlock =
    conversationHistory.length > 0
      ? `\n\nCONVERSATION HISTORY (last ${Math.min(conversationHistory.length, 10)} messages):\n${conversationHistory
          .slice(-10)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")}`
      : "";

  const goalsSummary = `
GOALS SUMMARY (last 7 days):
- Total: ${goals.stats.total} | Completed: ${goals.stats.completed} | In Progress: ${goals.stats.inProgress}
- Not Started: ${goals.stats.notStarted} | Blocked: ${goals.stats.blocked} | Carried Forward: ${goals.stats.carriedForward}
- Pending Manager Approval: ${goals.stats.pendingApproval} | Avg Progress: ${goals.stats.avgProgress}%
${
  goals.items.length > 0
    ? "\nTOP GOALS:\n" +
      goals.items
        .slice(0, 15)
        .map(
          (g) =>
            `  • [${g.status}/${g.priority}] ${g.title}${g.department ? ` (${g.department})` : ""}${g.progress ? ` — ${g.progress}%` : ""}`
        )
        .join("\n")
    : ""
}`;

  const blockersSummary =
    blockers.stats.total > 0
      ? `
OPEN BLOCKERS: ${blockers.stats.total} total | ${blockers.stats.critical} critical | ${blockers.stats.escalated} escalated | ${blockers.stats.slaBreached} SLA breached
${blockers.items
  .slice(0, 10)
  .map((b) => `  • [${b.severity.toUpperCase()}/${b.status}] ${b.title}${b.slaBreached ? " ⚠️ SLA BREACHED" : ""}`)
  .join("\n")}`
      : "\nOPEN BLOCKERS: None";

  const reportsSummary = `
REPORTS (last 7 days): ${reports.stats.total} total | Submitted: ${reports.stats.submitted} | Approved: ${reports.stats.approved} | Pending: ${reports.stats.draft} drafts | Late: ${reports.stats.lateSubmissions}`;

  const orgSummary = isAdminLevel
    ? `
ORGANIZATION: ${organization.totalMembers} active members across ${organization.departments.length} departments
DEPARTMENTS: ${organization.departments.map((d) => `${d.name}${d.manager ? ` (mgr: ${d.manager})` : ""}`).join(", ")}`
    : `\nYOUR DEPARTMENT: ${currentUser.department ?? "Not assigned"}`;

  const notifBlock =
    notifications.length > 0
      ? `\nYOUR UNREAD NOTIFICATIONS (${notifications.length}):\n${notifications
          .map((n) => `  • ${n.message}`)
          .join("\n")}`
      : "";

  return `You are the AI assistant for ${tenant?.name ?? "this organization"}'s internal platform.
You have FULL access to real-time data for this tenant. Today is ${today}.

YOUR USER:
- Role: ${currentUser.role}${currentUser.isOwner ? " (Owner)" : ""}
- Department: ${currentUser.department ?? "All departments"}
- Access level: ${isAdminLevel ? "Full organization access" : "Department-scoped access"}

TENANT: ${tenant?.name ?? "Unknown"} | Plan: ${plan.name} | Subscription: ${plan.status ?? "active"}
PENDING APPROVALS: ${pendingApprovals}
${orgSummary}
${currentCycle ? `\nCURRENT WEEK CYCLE: ${currentCycle.period} | Status: ${currentCycle.status} | Completion: ${currentCycle.summary?.completionPct ?? 0}%` : ""}
${goalsSummary}
${blockersSummary}
${reportsSummary}
${notifBlock}
${historyBlock}

INSTRUCTIONS:
- Answer directly using the data above. Never say data is unavailable if it's shown here.
- Be conversational but precise. Use numbers, names, and statuses from the data.
- For summary requests: give counts, key items, status breakdowns, and actionable insights.
- For specific queries: find the exact matching data and answer precisely.
- Highlight risks: critical blockers, SLA breaches, late reports, pending approvals.
- If asked about a specific person/department you don't have data for, say so clearly.
- Format with bullet points and sections when the answer is complex.
- Respond in the same language the user wrote in.

USER QUERY: ${userQuery}

Return JSON with this exact structure:
{
  "message": "your full conversational response here (may include markdown)",
  "intent": "one of: summary | goals | blockers | reports | team | approvals | blockers | general",
  "highlights": ["key insight 1", "key insight 2"],
  "actionItems": ["recommended action 1", "recommended action 2"],
  "dataUsed": ["goals", "blockers", "reports"]
}`;
}
