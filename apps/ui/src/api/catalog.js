import { healthApi } from "./health.js";
import { authApi } from "./auth.js";
import { mfaApi } from "./mfa.js";
import { userApi } from "./users.js";
import { tenantApi } from "./tenants.js";
import { membershipApi } from "./membership.js";
import { departmentApi } from "./departments.js";
import { taskApi } from "./tasks.js";
import { timeLogApi } from "./timeLogs.js";
import { notificationApi } from "./notifications.js";
import { auditApi } from "./audit.js";
import { billingApi } from "./billing.js";
import { aiApi } from "./ai.js";
import { aiReportApi } from "./aiReport.js";
import { reportApi } from "./reports.js";
export const apiCatalog = [
  {
    group: "Health",
    items: [
      {
        label: "Health Check",
        method: "GET",
        path: "/health",
        run: () => healthApi.check()
      }
    ]
  },
  {
    group: "Auth",
    items: [
      {
        label: "Signup",
        method: "POST",
        path: "/auth/signup",
        sample: { email: "user@dsr.io", password: "Passw0rd!", name: "Taylor" },
        run: (payload) => authApi.signup(payload)
      },
      {
        label: "Verify Email",
        method: "POST",
        path: "/auth/verify-email",
        sample: { email: "user@dsr.io", otp: "123456" },
        run: (payload) => authApi.verifyEmail(payload)
      },
      {
        label: "Resend Verification",
        method: "POST",
        path: "/auth/resend-verification",
        sample: { email: "user@dsr.io" },
        run: (payload) => authApi.resendVerification(payload)
      },
      {
        label: "Login",
        method: "POST",
        path: "/auth/login",
        sample: { email: "user@dsr.io", password: "Passw0rd!" },
        run: (payload) => authApi.login(payload)
      },
      {
        label: "Refresh",
        method: "POST",
        path: "/auth/refresh",
        sample: { refreshToken: "token" },
        run: (payload) => authApi.refresh(payload)
      },
      {
        label: "Logout",
        method: "POST",
        path: "/auth/logout",
        sample: { refreshToken: "token" },
        run: (payload) => authApi.logout(payload)
      },
      {
        label: "Logout All",
        method: "POST",
        path: "/auth/logout-all",
        sample: { refreshToken: "token" },
        run: (payload) => authApi.logoutAll(payload)
      },
      {
        label: "Forgot Password",
        method: "POST",
        path: "/auth/forgot-password",
        sample: { email: "user@dsr.io" },
        run: (payload) => authApi.forgotPassword(payload)
      },
      {
        label: "Reset Password",
        method: "POST",
        path: "/auth/reset-password",
        sample: { email: "user@dsr.io", otp: "123456", password: "NewPassw0rd!" },
        run: (payload) => authApi.resetPassword(payload)
      }
    ]
  },
  {
    group: "MFA",
    items: [
      {
        label: "Verify MFA",
        method: "POST",
        path: "/auth/mfa/verify",
        sample: { email: "user@dsr.io", token: "123456" },
        run: (payload) => mfaApi.verifyMFA(payload)
      },
      {
        label: "Setup TOTP",
        method: "POST",
        path: "/auth/mfa/setup",
        sample: { userId: "user-1" },
        run: (payload) => mfaApi.setupTOTP(payload)
      },
      {
        label: "Verify TOTP Setup",
        method: "POST",
        path: "/auth/mfa/verify-setup",
        sample: { token: "123456" },
        run: (payload) => mfaApi.verifyTOTPSetup(payload)
      },
      {
        label: "Disable MFA",
        method: "POST",
        path: "/auth/mfa/disable",
        sample: { token: "123456" },
        run: (payload) => mfaApi.disableMFA(payload)
      },
      {
        label: "MFA Status",
        method: "GET",
        path: "/auth/mfa/status",
        run: () => mfaApi.getStatus()
      },
      {
        label: "Regenerate Backup Codes",
        method: "POST",
        path: "/auth/mfa/backup-codes/regenerate",
        sample: { token: "123456" },
        run: (payload) => mfaApi.regenerateBackupCodes(payload)
      }
    ]
  },
  {
    group: "User",
    items: [
      {
        label: "Get Me",
        method: "GET",
        path: "/users/me",
        run: () => userApi.getMe()
      },
      {
        label: "Update Me",
        method: "PATCH",
        path: "/users/me",
        sample: { name: "Taylor", timezone: "America/New_York" },
        run: (payload) => userApi.updateMe(payload)
      },
      {
        label: "Change Password",
        method: "POST",
        path: "/users/change-password",
        sample: { currentPassword: "Passw0rd!", newPassword: "Passw0rd!" },
        run: (payload) => userApi.changePassword(payload)
      },
      {
        label: "Sessions",
        method: "GET",
        path: "/users/sessions",
        run: () => userApi.getSessions()
      },
      {
        label: "Revoke Session",
        method: "DELETE",
        path: "/users/sessions/:tokenId",
        sample: { tokenId: "token-1" },
        run: (payload) => userApi.revokeSession(payload.tokenId)
      }
    ]
  },
  {
    group: "Tenants",
    items: [
      {
        label: "Create Tenant",
        method: "POST",
        path: "/tenants",
        sample: { name: "Helios Systems", timezone: "America/New_York" },
        run: (payload) => tenantApi.create(payload)
      },
      {
        label: "My Tenants",
        method: "GET",
        path: "/tenants",
        run: () => tenantApi.listMyTenants()
      },
      {
        label: "Get Tenant",
        method: "GET",
        path: "/tenants/:tenantId",
        sample: { tenantId: "t-001" },
        run: (payload) => tenantApi.getById(payload.tenantId)
      },
      {
        label: "Update Tenant",
        method: "PATCH",
        path: "/tenants/:tenantId",
        sample: { tenantId: "t-001", name: "Helios Systems" },
        run: (payload) => tenantApi.update(payload.tenantId, payload)
      },
      {
        label: "Delete Tenant",
        method: "DELETE",
        path: "/tenants/:tenantId",
        sample: { tenantId: "t-001" },
        run: (payload) => tenantApi.delete(payload.tenantId)
      },
      {
        label: "Tenant Settings",
        method: "GET",
        path: "/tenants/:tenantId/settings",
        sample: { tenantId: "t-001" },
        run: (payload) => tenantApi.getSettings(payload.tenantId)
      },
      {
        label: "Update Tenant Settings",
        method: "PATCH",
        path: "/tenants/:tenantId/settings",
        sample: { tenantId: "t-001", workWeek: "Mon-Fri" },
        run: (payload) => tenantApi.updateSettings(payload.tenantId, payload)
      }
    ]
  },
  {
    group: "Membership",
    items: [
      {
        label: "List Members",
        method: "GET",
        path: "/tenants/:tenantId/members",
        sample: { tenantId: "t-001" },
        run: (payload) => membershipApi.listMembers(payload.tenantId)
      },
      {
        label: "Invite Member",
        method: "POST",
        path: "/tenants/:tenantId/members/invite",
        sample: { tenantId: "t-001", email: "user@dsr.io", role: "Developer" },
        run: (payload) => membershipApi.inviteMember(payload.tenantId, payload)
      },
      {
        label: "Accept Invite",
        method: "POST",
        path: "/tenants/:tenantId/members/accept",
        sample: { tenantId: "t-001", token: "invite-token" },
        run: (payload) => membershipApi.acceptInvite(payload.tenantId, payload)
      },
      {
        label: "Update Membership",
        method: "PATCH",
        path: "/tenants/:tenantId/members/:userId",
        sample: { tenantId: "t-001", userId: "user-2", role: "Manager" },
        run: (payload) => membershipApi.updateMembership(payload.tenantId, payload.userId, payload)
      },
      {
        label: "Remove Member",
        method: "DELETE",
        path: "/tenants/:tenantId/members/:userId",
        sample: { tenantId: "t-001", userId: "user-2" },
        run: (payload) => membershipApi.removeMember(payload.tenantId, payload.userId)
      },
      {
        label: "Transfer Ownership",
        method: "POST",
        path: "/tenants/:tenantId/members/:userId/transfer-ownership",
        sample: { tenantId: "t-001", userId: "user-2" },
        run: (payload) => membershipApi.transferOwnership(payload.tenantId, payload.userId, payload)
      }
    ]
  },
  {
    group: "Departments",
    items: [
      {
        label: "Create Department",
        method: "POST",
        path: "/tenants/:tenantId/departments",
        sample: { tenantId: "t-001", name: "Platform" },
        run: (payload) => departmentApi.create(payload.tenantId, payload)
      },
      {
        label: "List Departments",
        method: "GET",
        path: "/tenants/:tenantId/departments",
        sample: { tenantId: "t-001" },
        run: (payload) => departmentApi.list(payload.tenantId)
      },
      {
        label: "Get Department",
        method: "GET",
        path: "/tenants/:tenantId/departments/:departmentId",
        sample: { tenantId: "t-001", departmentId: "dept-1" },
        run: (payload) => departmentApi.getById(payload.tenantId, payload.departmentId)
      },
      {
        label: "Update Department",
        method: "PATCH",
        path: "/tenants/:tenantId/departments/:departmentId",
        sample: { tenantId: "t-001", departmentId: "dept-1", name: "Data" },
        run: (payload) => departmentApi.update(payload.tenantId, payload.departmentId, payload)
      },
      {
        label: "Delete Department",
        method: "DELETE",
        path: "/tenants/:tenantId/departments/:departmentId",
        sample: { tenantId: "t-001", departmentId: "dept-1" },
        run: (payload) => departmentApi.delete(payload.tenantId, payload.departmentId)
      }
    ]
  },
  {
    group: "Tasks",
    items: [
      {
        label: "Create Task",
        method: "POST",
        path: "/tenants/:tenantId/tasks",
        sample: { tenantId: "t-001", title: "Ship DSR UI", priority: "High" },
        run: (payload) => taskApi.create(payload.tenantId, payload)
      },
      {
        label: "List Tasks",
        method: "GET",
        path: "/tenants/:tenantId/tasks",
        sample: { tenantId: "t-001" },
        run: (payload) => taskApi.list(payload.tenantId)
      },
      {
        label: "Get Task",
        method: "GET",
        path: "/tenants/:tenantId/tasks/:taskId",
        sample: { tenantId: "t-001", taskId: "task-1" },
        run: (payload) => taskApi.getById(payload.tenantId, payload.taskId)
      },
      {
        label: "Update Task",
        method: "PATCH",
        path: "/tenants/:tenantId/tasks/:taskId",
        sample: { tenantId: "t-001", taskId: "task-1", status: "done" },
        run: (payload) => taskApi.update(payload.tenantId, payload.taskId, payload)
      },
      {
        label: "Delete Task",
        method: "DELETE",
        path: "/tenants/:tenantId/tasks/:taskId",
        sample: { tenantId: "t-001", taskId: "task-1" },
        run: (payload) => taskApi.delete(payload.tenantId, payload.taskId)
      }
    ]
  },
  {
    group: "Time Logs",
    items: [
      {
        label: "Create Time Log",
        method: "POST",
        path: "/tenants/:tenantId/tasks/:taskId/time-logs",
        sample: { tenantId: "t-001", taskId: "task-1", minutes: 60 },
        run: (payload) => timeLogApi.create(payload.tenantId, payload.taskId, payload)
      },
      {
        label: "List Time Logs",
        method: "GET",
        path: "/tenants/:tenantId/tasks/:taskId/time-logs",
        sample: { tenantId: "t-001", taskId: "task-1" },
        run: (payload) => timeLogApi.listForTask(payload.tenantId, payload.taskId)
      },
      {
        label: "Get Time Log",
        method: "GET",
        path: "/tenants/:tenantId/time-logs/:timeLogId",
        sample: { tenantId: "t-001", timeLogId: "log-1" },
        run: (payload) => timeLogApi.getById(payload.tenantId, payload.timeLogId)
      },
      {
        label: "Update Time Log",
        method: "PATCH",
        path: "/tenants/:tenantId/time-logs/:timeLogId",
        sample: { tenantId: "t-001", timeLogId: "log-1", minutes: 90 },
        run: (payload) => timeLogApi.update(payload.tenantId, payload.timeLogId, payload)
      },
      {
        label: "Delete Time Log",
        method: "DELETE",
        path: "/tenants/:tenantId/time-logs/:timeLogId",
        sample: { tenantId: "t-001", timeLogId: "log-1" },
        run: (payload) => timeLogApi.delete(payload.tenantId, payload.timeLogId)
      }
    ]
  },
  {
    group: "Notifications",
    items: [
      {
        label: "Unread Count",
        method: "GET",
        path: "/notifications/unread-count",
        run: () => notificationApi.getUnreadCount()
      },
      {
        label: "List Notifications",
        method: "GET",
        path: "/notifications",
        run: () => notificationApi.list()
      },
      {
        label: "Mark As Read",
        method: "PATCH",
        path: "/notifications/:id/read",
        sample: { id: "notif-1" },
        run: (payload) => notificationApi.markAsRead(payload.id)
      }
    ]
  },
  {
    group: "Audit",
    items: [
      {
        label: "List Audit Logs",
        method: "GET",
        path: "/audit",
        run: () => auditApi.list()
      },
      {
        label: "Get Audit Log",
        method: "GET",
        path: "/audit/:id",
        sample: { id: "audit-1" },
        run: (payload) => auditApi.getById(payload.id)
      }
    ]
  },
  {
    group: "Billing",
    items: [
      {
        label: "List Plans",
        method: "GET",
        path: "/billing/plans",
        run: () => billingApi.listPlans()
      },
      {
        label: "Create Plan",
        method: "POST",
        path: "/billing/plans",
        sample: { name: "Enterprise", price: 999 },
        run: (payload) => billingApi.createPlan(payload)
      },
      {
        label: "Update Plan",
        method: "PATCH",
        path: "/billing/plans/:planId",
        sample: { planId: "plan-1", price: 899 },
        run: (payload) => billingApi.updatePlan(payload.planId, payload)
      },
      {
        label: "Toggle Plan",
        method: "PATCH",
        path: "/billing/plans/:planId/toggle",
        sample: { planId: "plan-1" },
        run: (payload) => billingApi.togglePlan(payload.planId, payload)
      },
      {
        label: "Delete Plan",
        method: "DELETE",
        path: "/billing/plans/:planId",
        sample: { planId: "plan-1" },
        run: (payload) => billingApi.deletePlan(payload.planId)
      },
      {
        label: "Get Subscription",
        method: "GET",
        path: "/billing/:tenantId/subscription",
        sample: { tenantId: "t-001" },
        run: (payload) => billingApi.getSubscription(payload.tenantId)
      },
      {
        label: "Subscribe",
        method: "POST",
        path: "/billing/:tenantId/subscribe",
        sample: { tenantId: "t-001", planId: "plan-1" },
        run: (payload) => billingApi.subscribe(payload.tenantId, payload)
      },
      {
        label: "Upgrade",
        method: "POST",
        path: "/billing/:tenantId/upgrade",
        sample: { tenantId: "t-001", planId: "plan-2" },
        run: (payload) => billingApi.upgrade(payload.tenantId, payload)
      },
      {
        label: "Cancel",
        method: "POST",
        path: "/billing/:tenantId/cancel",
        sample: { tenantId: "t-001", reason: "budget" },
        run: (payload) => billingApi.cancel(payload.tenantId, payload)
      },
      {
        label: "Resume",
        method: "POST",
        path: "/billing/:tenantId/resume",
        sample: { tenantId: "t-001" },
        run: (payload) => billingApi.resume(payload.tenantId, payload)
      },
      {
        label: "Billing Webhook",
        method: "POST",
        path: "/billing/webhook",
        sample: { event: "checkout.session.completed" },
        run: (payload) => billingApi.webhook(payload)
      }
    ]
  },
  {
    group: "AI",
    items: [
      {
        label: "Assistant Query",
        method: "POST",
        path: "/ai/assistant/query",
        sample: { prompt: "Summarize team performance" },
        run: (payload) => aiApi.assistantQuery(payload)
      },
      {
        label: "Audit Search",
        method: "POST",
        path: "/ai/audit/search",
        sample: { query: "billing" },
        run: (payload) => aiApi.auditSearch(payload)
      }
    ]
  },
  {
    group: "AI Reports",
    items: [
      {
        label: "Generate DSR",
        method: "POST",
        path: "/ai/report/dsr",
        sample: { userId: "user-1", date: "2026-02-27" },
        run: (payload) => aiReportApi.generateDSR(payload)
      },
      {
        label: "Get Latest DSR",
        method: "GET",
        path: "/ai/report/dsr/latest",
        run: () => aiReportApi.getLatestDSR()
      },
      {
        label: "Weekly Report",
        method: "POST",
        path: "/ai/report/weekly",
        sample: { week: "2026-W09" },
        run: (payload) => aiReportApi.generateWeekly(payload)
      },
      {
        label: "Monthly Report",
        method: "POST",
        path: "/ai/report/monthly",
        sample: { month: "2026-02" },
        run: (payload) => aiReportApi.generateMonthly(payload)
      },
      {
        label: "Quarterly Report",
        method: "POST",
        path: "/ai/report/quarterly",
        sample: { quarter: "2026-Q1" },
        run: (payload) => aiReportApi.generateQuarterly(payload)
      },
      {
        label: "Yearly Report",
        method: "POST",
        path: "/ai/report/yearly",
        sample: { year: 2026 },
        run: (payload) => aiReportApi.generateYearly(payload)
      },
      {
        label: "Report Status",
        method: "GET",
        path: "/ai/report/status/:jobId",
        sample: { jobId: "job-1" },
        run: (payload) => aiReportApi.getStatus(payload.jobId)
      },
      {
        label: "Report History",
        method: "GET",
        path: "/ai/report/history",
        run: () => aiReportApi.getHistory()
      },
      {
        label: "Get Report",
        method: "GET",
        path: "/ai/report/:reportId",
        sample: { reportId: "report-1" },
        run: (payload) => aiReportApi.getReport(payload.reportId)
      },
      {
        label: "Export Report",
        method: "POST",
        path: "/ai/report/export/:reportId",
        sample: { reportId: "report-1", format: "pdf" },
        run: (payload) => aiReportApi.exportReport(payload.reportId, payload)
      }
    ]
  },
  {
    group: "Reporting Engine",
    items: [
      {
        label: "Create Template",
        method: "POST",
        path: "/reports/templates",
        sample: { name: "Weekly KPI", type: "weekly" },
        run: (payload) => reportApi.createTemplate(payload)
      },
      {
        label: "Update Template",
        method: "PUT",
        path: "/reports/templates/:templateId",
        sample: { templateId: "template-1", name: "Monthly KPI" },
        run: (payload) => reportApi.updateTemplate(payload.templateId, payload)
      },
      {
        label: "Get Template",
        method: "GET",
        path: "/reports/templates/:templateId",
        sample: { templateId: "template-1" },
        run: (payload) => reportApi.getTemplate(payload.templateId)
      },
      {
        label: "List Templates",
        method: "GET",
        path: "/reports/templates",
        run: () => reportApi.listTemplates()
      },
      {
        label: "Delete Template",
        method: "DELETE",
        path: "/reports/templates/:templateId",
        sample: { templateId: "template-1" },
        run: (payload) => reportApi.deleteTemplate(payload.templateId)
      },
      {
        label: "Update Template Status",
        method: "PATCH",
        path: "/reports/templates/:templateId/status",
        sample: { templateId: "template-1", status: "active" },
        run: (payload) => reportApi.updateTemplateStatus(payload.templateId, payload)
      },
      {
        label: "Clone Template",
        method: "POST",
        path: "/reports/templates/:templateId/clone",
        sample: { templateId: "template-1" },
        run: (payload) => reportApi.cloneTemplate(payload.templateId)
      },
      {
        label: "Upcoming Schedules",
        method: "GET",
        path: "/reports/schedules/upcoming",
        run: () => reportApi.getUpcomingSchedules()
      },
      {
        label: "Create Schedule",
        method: "POST",
        path: "/reports/schedules",
        sample: { templateId: "template-1", cadence: "weekly" },
        run: (payload) => reportApi.createSchedule(payload)
      },
      {
        label: "Update Schedule",
        method: "PUT",
        path: "/reports/schedules/:scheduleId",
        sample: { scheduleId: "schedule-1", cadence: "monthly" },
        run: (payload) => reportApi.updateSchedule(payload.scheduleId, payload)
      },
      {
        label: "Pause Schedule",
        method: "PATCH",
        path: "/reports/schedules/:scheduleId/pause",
        sample: { scheduleId: "schedule-1" },
        run: (payload) => reportApi.pauseSchedule(payload.scheduleId)
      },
      {
        label: "Resume Schedule",
        method: "PATCH",
        path: "/reports/schedules/:scheduleId/resume",
        sample: { scheduleId: "schedule-1" },
        run: (payload) => reportApi.resumeSchedule(payload.scheduleId)
      },
      {
        label: "Delete Schedule",
        method: "DELETE",
        path: "/reports/schedules/:scheduleId",
        sample: { scheduleId: "schedule-1" },
        run: (payload) => reportApi.deleteSchedule(payload.scheduleId)
      },
      {
        label: "List Schedules",
        method: "GET",
        path: "/reports/schedules",
        run: () => reportApi.listSchedules()
      },
      {
        label: "Run Schedule Now",
        method: "POST",
        path: "/reports/schedules/:scheduleId/run",
        sample: { scheduleId: "schedule-1" },
        run: (payload) => reportApi.runScheduleNow(payload.scheduleId, payload)
      },
      {
        label: "Run Template",
        method: "POST",
        path: "/reports/templates/:templateId/run",
        sample: { templateId: "template-1" },
        run: (payload) => reportApi.runTemplate(payload.templateId, payload)
      },
      {
        label: "List Runs",
        method: "GET",
        path: "/reports/runs",
        run: () => reportApi.listRuns()
      },
      {
        label: "Get Run",
        method: "GET",
        path: "/reports/runs/:runId",
        sample: { runId: "run-1" },
        run: (payload) => reportApi.getRun(payload.runId)
      },
      {
        label: "Retry Run",
        method: "POST",
        path: "/reports/runs/:runId/retry",
        sample: { runId: "run-1" },
        run: (payload) => reportApi.retryRun(payload.runId)
      },
      {
        label: "Delete Run",
        method: "DELETE",
        path: "/reports/runs/:runId",
        sample: { runId: "run-1" },
        run: (payload) => reportApi.deleteRun(payload.runId)
      },
      {
        label: "Download Run",
        method: "GET",
        path: "/reports/runs/:runId/download",
        sample: { runId: "run-1" },
        run: (payload) => reportApi.downloadRun(payload.runId)
      },
      {
        label: "Report Stats",
        method: "GET",
        path: "/reports/stats",
        run: () => reportApi.getStats()
      }
    ]
  }
];


