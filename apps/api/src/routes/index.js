import { Router } from "express";
import { createHealthRoutes } from "#api/modules/health/health.routes.js";
import { createAuthRoutes } from "#api/modules/auth/auth.routes.js";
import { createUserRoutes } from "#api/modules/user/user.routes.js";
import { createAdminRoutes } from "#api/modules/admin/admin.routes.js";
import { createAuditRoutes } from "#api/modules/audit/audit.routes.js";
import { createNotificationRoutes } from "#api/modules/notification/notification.routes.js";
import { createBillingRoutes } from "#api/modules/billing/billing.routes.js";
import { createTenantRoutes } from "#api/modules/tenant/tenant.routes.js";
import { createDashboardRoutes } from "#api/modules/dashboard/dashboard.routes.js";
import { createAnalyticsRoutes } from "#api/modules/analytics/analytics.routes.js";
import { createApiKeyRoutes } from "#api/modules/apiKeys/apiKey.routes.js";
import reportAIRoutes from "#api/modules/reporting/report.ai.routes.js";
import reportingRoutes from "#api/modules/reporting/reporting.routes.js";
import aiRoutes from "#api/modules/ai/ai.routes.js";
import mfaroute from "#api/modules/auth/mfa.routes.js";
import { createSystemTemplateRoutes, createTemplateRoutes } from "#api/modules/templates/template.routes.js";
import { createReportRoutes } from "#api/modules/reports/report.routes.js";
import { createGoalRoutes } from "#api/modules/goals/goal.routes.js";
import { createWorkGoalRoutes } from "#api/modules/workGoals/workGoal.routes.js";
import { createWeekCycleRoutes } from "#api/modules/weekCycles/weekCycle.routes.js";
import { createWorkReportRoutes } from "#api/modules/workReports/workReport.routes.js";
import { createGoalAnalysisRoutes } from "#api/modules/goalAnalysis/goalAnalysis.routes.js";
import { createBlockerRoutes } from "#api/modules/blockers/blocker.routes.js";
import { createRolesRoutes } from "#api/modules/roles/roles.routes.js";
import { createSupportRoutes } from "#api/modules/support/support.routes.js";
import { createIntegrationsRoutes } from "#api/routes/integrations.routes.js";
import { createGitHubIntegrationRoutes } from "#api/routes/integrations.github.routes.js";
import { createAdminSecurityRoutes } from "#api/modules/admin/admin.security.routes.js";
import { createAutomationRoutes } from "#api/modules/automations/automation.routes.js";
import { createDeadlinePolicyRoutes } from "#api/modules/deadline-policies/deadlinePolicy.routes.js";
import { createAIPolicyRoutes } from "#api/modules/ai-policies/aiPolicy.routes.js";
import { createLateSubmissionRoutes } from "#api/modules/workReports/lateSubmission.routes.js";
import { createPenaltyPolicyRoutes, createPenaltyLogRoutes } from "#api/modules/workReports/penaltyPolicy.routes.js";

export const createRoutes = ({ controllers }) => {
  const router = Router();
  const registerVersioned = (path, routeFactory) => {
    router.use(`/api${path}`, routeFactory);
    router.use(`/api/v1${path}`, routeFactory);
  };

  router.use("/health", createHealthRoutes({ healthController: controllers.healthController }));

  // Auth routes (from origin/main: /api/* prefix)
  registerVersioned("/auth", createAuthRoutes({ authController: controllers.authController }));
  registerVersioned("/auth/mfa", mfaroute);

  // User management
  registerVersioned("/users", createUserRoutes({ userController: controllers.userController }));

  // Roles & Admin (local additions)
  registerVersioned("/roles", createRolesRoutes());
  registerVersioned("/admin", createAdminRoutes({ adminController: controllers.adminController }));
  registerVersioned("/admin/security", createAdminSecurityRoutes());

  // Core platform routes (from origin/main: /api/* prefix)
  registerVersioned("/audit", createAuditRoutes({ auditController: controllers.auditController }));
  registerVersioned("/notifications", createNotificationRoutes({ notificationController: controllers.notificationController }));
  registerVersioned("/billing", createBillingRoutes({ billingController: controllers.billingController }));
  registerVersioned("/dashboard", createDashboardRoutes());
  registerVersioned("/analytics", createAnalyticsRoutes());
  registerVersioned("/api-keys", createApiKeyRoutes());

  // Support (local addition)
  registerVersioned("/support", createSupportRoutes());

  registerVersioned(
    "/tenants",
    createTenantRoutes({
      tenantController: controllers.tenantController,
      membershipController: controllers.membershipController,
      departmentController: controllers.departmentController,
      taskController: controllers.taskController,
      taskTimeLogController: controllers.taskTimeLogController,
    })
  );
  registerVersioned("/ai/report", reportAIRoutes);
  registerVersioned("/ai", aiRoutes);
  router.use("/reports", reportingRoutes);
  registerVersioned("/templates", createTemplateRoutes());
  registerVersioned("/system-templates", createSystemTemplateRoutes());
  registerVersioned("/report-templates", createTemplateRoutes());
  registerVersioned("/reports", createReportRoutes());
  registerVersioned("/okr-goals", createGoalRoutes());
  registerVersioned("/goals", createWorkGoalRoutes());
  registerVersioned("/work-goals", createWorkGoalRoutes());
  registerVersioned("/week-cycles", createWeekCycleRoutes());
  registerVersioned("/work-reports", createWorkReportRoutes());
  registerVersioned("/goal-analysis", createGoalAnalysisRoutes());
  registerVersioned("/blockers", createBlockerRoutes());
  registerVersioned("/automations", createAutomationRoutes());
  registerVersioned("/deadline-policies", createDeadlinePolicyRoutes());
  registerVersioned("/ai-policies", createAIPolicyRoutes());
  registerVersioned("/late-submission-requests", createLateSubmissionRoutes());
  registerVersioned("/penalty-policies", createPenaltyPolicyRoutes());
  registerVersioned("/penalty-logs", createPenaltyLogRoutes());
  router.use("/v1/integrations/github", createGitHubIntegrationRoutes());
  router.use("/v1/integrations", createIntegrationsRoutes());

  return router;
};
