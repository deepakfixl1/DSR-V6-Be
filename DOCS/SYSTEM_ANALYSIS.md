# DSR/WSR Platform — Complete System Analysis

> Generated: 2026-03-08 | Backend: Express.js + MongoDB + Redis | AI: OpenAI

---

## PHASE 1 — COMPLETE BACKEND ROUTE MAP

### Module: Authentication

**Routes:**
```
POST /auth/signup
POST /auth/verify-email
POST /auth/resend-verification
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/logout-all
POST /auth/forgot-password
POST /auth/reset-password
```

**Controller:** `auth.controller.js`
**Service:** `auth.service.js`

---

### Module: MFA (Multi-Factor Authentication)

**Routes:**
```
POST /auth/mfa/verify              (public)
POST /auth/mfa/setup               (auth required)
POST /auth/mfa/verify-setup        (auth required)
POST /auth/mfa/disable             (auth required)
GET  /auth/mfa/status              (auth required)
POST /auth/mfa/backup-codes/regenerate  (auth required)
```

**Controller:** `mfa.controller.js`
**Service:** `mfa.service.js`, `mfa.service.speakeasy.js`

---

### Module: Users

**Routes:**
```
GET    /users/me
PATCH  /users/me
POST   /users/change-password
GET    /users/sessions
DELETE /users/sessions/:tokenId
```

**Controller:** `user.controller.js`
**Service:** `user.service.js`

---

### Module: Tenants

**Routes:**
```
POST   /tenants/
GET    /tenants/
GET    /tenants/:tenantId
PATCH  /tenants/:tenantId
DELETE /tenants/:tenantId
GET    /tenants/:tenantId/settings
PATCH  /tenants/:tenantId/settings
```

**Controller:** `tenant.controller.js`
**Service:** `tenant.service.js`

---

### Module: Membership

**Routes (nested under /tenants/:tenantId):**
```
GET    /tenants/:tenantId/members
POST   /tenants/:tenantId/members/invite
POST   /tenants/:tenantId/members/accept
PATCH  /tenants/:tenantId/members/:userId
DELETE /tenants/:tenantId/members/:userId
POST   /tenants/:tenantId/members/:userId/transfer-ownership
```

**Controller:** `membership.controller.js`
**Service:** `membership.service.js`

---

### Module: Departments

**Routes (nested under /tenants/:tenantId):**
```
POST   /tenants/:tenantId/departments
GET    /tenants/:tenantId/departments
GET    /tenants/:tenantId/departments/:departmentId
PATCH  /tenants/:tenantId/departments/:departmentId
DELETE /tenants/:tenantId/departments/:departmentId
```

**Controller:** `department.controller.js`
**Service:** `department.service.js`

---

### Module: Tasks

**Routes (nested under /tenants/:tenantId):**
```
POST   /tenants/:tenantId/tasks
GET    /tenants/:tenantId/tasks
GET    /tenants/:tenantId/tasks/:taskId
PATCH  /tenants/:tenantId/tasks/:taskId
DELETE /tenants/:tenantId/tasks/:taskId
POST   /tenants/:tenantId/tasks/:taskId/time-logs
GET    /tenants/:tenantId/tasks/:taskId/time-logs
GET    /tenants/:tenantId/time-logs/:timeLogId
PATCH  /tenants/:tenantId/time-logs/:timeLogId
DELETE /tenants/:tenantId/time-logs/:timeLogId
```

**Controller:** `task.controller.js`, `taskTimeLog.controller.js`
**Service:** `task.service.js`, `taskTimeLog.service.js`

---

### Module: OKR Goals

**Routes:**
```
POST   /api/okr-goals/
GET    /api/okr-goals/
GET    /api/okr-goals/:id
PUT    /api/okr-goals/:id
DELETE /api/okr-goals/:id
PATCH  /api/okr-goals/:id/key-results/:krIndex
```

**Controller:** `goal.controller.js`
**Service:** `goal.service.js`

---

### Module: Work Goals (Weekly Goals)

**Routes:**
```
POST   /api/goals/                           (also /api/work-goals/)
GET    /api/goals/
GET    /api/goals/week/current
GET    /api/goals/pending
GET    /api/goals/employee/:employeeId
GET    /api/goals/hierarchy/:weekStart
GET    /api/goals/:id
PUT    /api/goals/:id
PATCH  /api/goals/:id/progress
```

**Controller:** `workGoal.controller.js`
**Service:** `workGoal.service.js`

---

### Module: Week Cycles

**Routes:**
```
POST   /api/week-cycles/
GET    /api/week-cycles/
GET    /api/week-cycles/:id
POST   /api/week-cycles/:id/carry-forward
```

**Controller:** `weekCycle.controller.js`
**Service:** `weekCycle.service.js`

---

### Module: Work Reports (DSR/WSR/MSR)

**Routes:**
```
POST   /api/work-reports/
GET    /api/work-reports/
GET    /api/work-reports/:id
PUT    /api/work-reports/:id
GET    /api/work-reports/template/:reportType
POST   /api/work-reports/:id/submit
POST   /api/work-reports/:id/approve
POST   /api/work-reports/:id/reject
```

**Controller:** `workReport.controller.js`
**Service:** `workReport.service.js`

---

### Module: Reports (General)

**Routes:**
```
POST   /api/reports/
GET    /api/reports/
GET    /api/reports/:id
PUT    /api/reports/:id
POST   /api/reports/:id/submit
POST   /api/reports/:id/approve
POST   /api/reports/:id/reject
```

**Controller:** `report.controller.js`
**Service:** `report.service.js`

---

### Module: Report Templates (DSR/WSR specific)

**Routes:**
```
POST   /api/templates/
GET    /api/templates/
GET    /api/templates/:id
PUT    /api/templates/:id
DELETE /api/templates/:id
POST   /api/templates/:id/publish
POST   /api/templates/:code/clone
GET    /api/templates/by-department/:departmentId/:reportType
GET    /api/templates/system/:reportType
POST   /api/templates/:id/assign-department
```

**Controller:** `template.controller.js`
**Service:** `template.service.js`

---

### Module: Reporting Engine Templates

**Routes:**
```
POST   /reports/templates/
GET    /reports/templates/
GET    /reports/templates/:templateId
PUT    /reports/templates/:templateId
DELETE /reports/templates/:templateId
PATCH  /reports/templates/:templateId/status
POST   /reports/templates/:templateId/clone
```

**Controller:** `reportTemplate.controller.js`
**Service:** `reportTemplate.service.js`

---

### Module: Report Schedules

**Routes:**
```
POST   /reports/schedules/
GET    /reports/schedules/
GET    /reports/schedules/upcoming
PUT    /reports/schedules/:scheduleId
PATCH  /reports/schedules/:scheduleId/pause
PATCH  /reports/schedules/:scheduleId/resume
DELETE /reports/schedules/:scheduleId
POST   /reports/schedules/:scheduleId/run
```

**Controller:** `reportSchedule.controller.js`
**Service:** `reportSchedule.service.js`

---

### Module: Report Runs

**Routes:**
```
POST   /reports/templates/:templateId/run
GET    /reports/runs/
GET    /reports/runs/:runId
POST   /reports/runs/:runId/retry
DELETE /reports/runs/:runId
GET    /reports/runs/:runId/download
GET    /reports/stats
```

**Controller:** `reportRun.controller.js`
**Service:** `reportRun.service.js`

---

### Module: Goal Analysis

**Routes:**
```
GET /api/goal-analysis/dsr-suggestions
GET /api/goal-analysis/work-reports/:reportId
GET /api/goal-analysis/period
```

**Controller:** `goalAnalysis.controller.js`
**Service:** `goalAnalysis.service.js`

---

### Module: Blockers

**Routes:**
```
POST  /api/blockers/
GET   /api/blockers/
GET   /api/blockers/:id
PATCH /api/blockers/:id
PATCH /api/blockers/:id/escalate
PATCH /api/blockers/:id/resolve
```

**Controller:** `blocker.controller.js`
**Service:** `blocker.service.js`, `blocker.sla.service.js`

---

### Module: AI Analysis

**Routes:**
```
POST /ai/assistant/query
POST /ai/audit/search
GET  /ai/dsr/suggestions
GET  /ai/goals/pending
GET  /ai/goals/recommendations
POST /ai/report/analyze
GET  /ai/report/:reportId/analysis
GET  /ai/goals/:goalId/progress-analysis
GET  /ai/wsr/analysis
GET  /ai/msr/analysis
GET  /ai/quarterly/analysis
GET  /ai/yearly/analysis
```

**Controller:** `ai.controller.js`
**Service:** `ai.service.js`

---

### Module: AI Report

**Routes:**
```
POST /ai/report/dsr              (DEPRECATED - 410 Gone)
GET  /ai/report/dsr/latest
POST /ai/report/weekly           (DEPRECATED - 410 Gone)
POST /ai/report/monthly          (DEPRECATED - 410 Gone)
POST /ai/report/quarterly        (DEPRECATED - 410 Gone)
POST /ai/report/yearly           (DEPRECATED - 410 Gone)
GET  /ai/report/status/:jobId
GET  /ai/report/history
GET  /ai/report/:reportId
POST /ai/report/export/:reportId
```

**Controller:** `report.ai.controller.js`
**Service:** `report.ai.service.js`

---

### Module: Notifications

**Routes:**
```
GET   /notifications/unread-count
GET   /notifications/
PATCH /notifications/:id/read
```

**Controller:** `notification.controller.js`
**Service:** `notification.service.js`

---

### Module: Billing

**Routes:**
```
GET    /billing/plans
POST   /billing/plans              (admin only)
PATCH  /billing/plans/:planId      (admin only)
PATCH  /billing/plans/:planId/toggle  (admin only)
DELETE /billing/plans/:planId      (admin only)
GET    /billing/:tenantId/subscription
POST   /billing/:tenantId/subscribe
POST   /billing/:tenantId/upgrade
POST   /billing/:tenantId/cancel
POST   /billing/:tenantId/resume
POST   /billing/webhook            (Stripe webhook - unauth)
```

**Controller:** `billing.controller.js`, `billing.webhook.controller.js`
**Service:** `billing.service.js`

---

### Module: Audit Logs

**Routes:**
```
GET /audit/       (admin only)
GET /audit/:id    (admin only)
GET /api/audit/   (admin only - duplicate)
GET /api/audit/:id
```

**Controller:** `audit.controller.js`
**Service:** `audit.service.js`

---

### Module: Integrations (General)

**Routes:**
```
GET    /v1/integrations/
GET    /v1/integrations/:type
PATCH  /v1/integrations/:type
GET    /v1/integrations/:type/credentials
DELETE /v1/integrations/:type/credentials/:kind
```

---

### Module: GitHub Integration

**Routes:**
```
GET  /v1/integrations/github/oauth/start
GET  /v1/integrations/github/oauth/callback
POST /v1/integrations/github/disconnect
GET  /v1/integrations/github/repos
POST /v1/integrations/github/resources/repos/enable
PATCH /v1/integrations/github/resources/repos/:repoId/branches
GET  /v1/integrations/github/resources
GET  /v1/integrations/github/commits/today
GET  /v1/integrations/github/commits/since-last-sync
```

---

### Module: Health

**Routes:**
```
GET /health
```

---

## PHASE 2 — GROUPED MODULES BY DOMAIN

| Domain | Routes | Purpose |
|--------|--------|---------|
| **Authentication** | /auth/*, /auth/mfa/* | User auth, MFA, session management |
| **Users** | /users/* | Profile management, sessions |
| **Tenants** | /tenants/* | Organization/company management |
| **Membership** | /tenants/:id/members/* | Team invitations and roles |
| **Departments** | /tenants/:id/departments/* | Org structure/hierarchy |
| **Tasks** | /tenants/:id/tasks/* | Task tracking with time logs |
| **OKR Goals** | /api/okr-goals/* | OKR framework goals |
| **Work Goals** | /api/goals/*, /api/work-goals/* | Weekly work goals with hierarchy |
| **Week Cycles** | /api/week-cycles/* | Weekly sprint management |
| **Work Reports** | /api/work-reports/* | DSR/WSR/MSR submission & review |
| **Reports** | /api/reports/* | General report CRUD |
| **Templates** | /api/templates/* | DSR/WSR field templates |
| **Reporting Engine** | /reports/* | Advanced report scheduling & runs |
| **Goal Analysis** | /api/goal-analysis/* | Goal vs report analytics |
| **Blockers** | /api/blockers/* | Impediment tracking with SLA |
| **AI Analysis** | /ai/* | OpenAI-powered analysis & suggestions |
| **Notifications** | /notifications/* | In-app notification inbox |
| **Billing** | /billing/* | Stripe subscription management |
| **Audit Logs** | /audit/*, /api/audit/* | Immutable audit trail |
| **Integrations** | /v1/integrations/* | GitHub OAuth integration |

---

## PHASE 3 — MISSING ROUTES ANALYSIS

See `MISSING_ROUTES_SUGGESTIONS.md` for full details.

**Summary of gaps:**
1. No MSR (Monthly Status Report) dedicated endpoints (only AI analysis exists)
2. No Quarterly Report submit endpoint (only AI analysis)
3. No Goal carry-forward without week cycle
4. No bulk report approval
5. No dashboard stats endpoint
6. No employee self-service goal creation (only manager-assigned)
7. No report history per employee/department
8. No notification mark-all-read
9. No template preview endpoint
10. No department-level analytics

---

## PHASE 4 — FRONTEND PAGE DESIGN

### Employee Pages

#### 1. Dashboard
- **Purpose:** Personal overview with today's goals, pending reports, AI nudges
- **API:** `GET /api/goals/week/current`, `GET /api/work-reports/`, `GET /ai/dsr/suggestions`, `GET /notifications/unread-count`
- **Components:** StatsRow, GoalCard, PendingReportBanner, AIInsightPanel, ActivityFeed

#### 2. Weekly Goals
- **Purpose:** View/manage current week goals with progress tracking
- **API:** `GET /api/goals/week/current`, `GET /api/goals/pending`, `PATCH /api/goals/:id/progress`, `GET /api/week-cycles/`
- **Components:** GoalList, GoalCard, ProgressSlider, WeekSelector, GoalHierarchyTree

#### 3. Create DSR
- **Purpose:** Submit daily status report with AI suggestions
- **API:** `GET /api/work-reports/template/dsr`, `POST /api/work-reports/`, `GET /ai/dsr/suggestions`, `GET /v1/integrations/github/commits/today`
- **Components:** ReportForm, DynamicFieldRenderer, AIPanel, GitHubCommitsPreview

#### 4. Create WSR
- **Purpose:** Submit weekly summary report
- **API:** `GET /api/work-reports/template/wsr`, `POST /api/work-reports/`, `GET /ai/wsr/analysis`
- **Components:** ReportForm, GoalSummaryPanel, AIPanel

#### 5. Create MSR
- **Purpose:** Submit monthly status report
- **API:** `GET /api/work-reports/template/msr`, `POST /api/work-reports/`, `GET /ai/msr/analysis`
- **Components:** ReportForm, MonthlyGoalSummary, AIPanel

#### 6. Report History
- **Purpose:** View all submitted reports with status filters
- **API:** `GET /api/work-reports/`, `GET /ai/report/:id/analysis`
- **Components:** ReportTable, StatusBadge, FilterBar, ReportDrawer

#### 7. AI Suggestions Panel
- **Purpose:** Standalone AI advice and recommendations
- **API:** `GET /ai/dsr/suggestions`, `GET /ai/goals/recommendations`, `GET /ai/goals/pending`, `POST /ai/assistant/query`
- **Components:** SuggestionCard, ChatInterface, GoalRecommendations

### Manager Pages

#### 8. Team Dashboard
- **Purpose:** Team overview — report status, goal completion, blockers
- **API:** `GET /api/work-reports/`, `GET /api/goals/`, `GET /api/blockers/`, `GET /api/goal-analysis/period`
- **Components:** TeamGrid, ReportStatusMatrix, BlockerAlert, CompletionChart

#### 9. Goal Assignment
- **Purpose:** Create and assign weekly goals to team members
- **API:** `POST /api/goals/`, `GET /api/goals/employee/:id`, `GET /api/goals/hierarchy/:weekStart`, `GET /tenants/:id/members`
- **Components:** GoalCreator, MemberPicker, GoalHierarchyEditor, WeekCycleSelector

#### 10. Report Review
- **Purpose:** Approve/reject submitted reports with comments
- **API:** `GET /api/work-reports/`, `POST /api/work-reports/:id/approve`, `POST /api/work-reports/:id/reject`
- **Components:** ReportReviewTable, ReportDetailDrawer, ApproveRejectModal

#### 11. AI Goal Analysis
- **Purpose:** AI-powered goal progress analysis per employee/period
- **API:** `GET /api/goal-analysis/period`, `GET /ai/goals/:id/progress-analysis`, `GET /api/goal-analysis/work-reports/:id`
- **Components:** AnalysisReport, GoalProgressChart, PeriodSelector, EmployeeFilter

#### 12. Weekly Analysis
- **Purpose:** AI-powered weekly team performance analysis
- **API:** `GET /ai/wsr/analysis`
- **Components:** WeeklyReport, CompletionMatrix, TrendChart

#### 13. Monthly Analysis
- **Purpose:** AI-powered monthly analysis with trend detection
- **API:** `GET /ai/msr/analysis`, `GET /ai/quarterly/analysis`
- **Components:** MonthlyReport, GoalTrends, PerformanceHeatmap

### Admin Pages

#### 14. Department Management
- **Purpose:** Create/manage org departments and hierarchy
- **API:** `GET/POST/PATCH/DELETE /tenants/:id/departments`
- **Components:** DepartmentTree, DepartmentForm, MemberAssignment

#### 15. Template Management
- **Purpose:** Create and manage DSR/WSR field templates
- **API:** `GET/POST/PUT/DELETE /api/templates/`, `POST /api/templates/:id/publish`, `POST /api/templates/:id/assign-department`
- **Components:** TemplateBuilder, FieldEditor, DepartmentAssignment, PreviewModal

#### 16. Organization Settings
- **Purpose:** Tenant-level configuration
- **API:** `GET/PATCH /tenants/:id/settings`, `GET/PATCH /tenants/:id`
- **Components:** SettingsForm, BillingPanel, IntegrationCards

---

## PHASE 5 — FRONTEND FOLDER STRUCTURE

```
frontendv2/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── SignupPage.jsx
│   │   │   │   ├── ForgotPasswordPage.jsx
│   │   │   │   ├── ResetPasswordPage.jsx
│   │   │   │   └── MFAVerifyPage.jsx
│   │   │   ├── components/
│   │   │   │   ├── AuthForm.jsx
│   │   │   │   └── MFAForm.jsx
│   │   │   └── services/
│   │   │       └── auth.api.js
│   │   │
│   │   ├── goals/
│   │   │   ├── pages/
│   │   │   │   ├── WeeklyGoalsPage.jsx
│   │   │   │   ├── GoalDetailPage.jsx
│   │   │   │   └── GoalAssignmentPage.jsx  (manager)
│   │   │   ├── components/
│   │   │   │   ├── GoalCard.jsx
│   │   │   │   ├── GoalForm.jsx
│   │   │   │   ├── GoalHierarchyTree.jsx
│   │   │   │   ├── ProgressSlider.jsx
│   │   │   │   └── WeekSelector.jsx
│   │   │   └── services/
│   │   │       └── goals.api.js
│   │   │
│   │   ├── reports/
│   │   │   ├── pages/
│   │   │   │   ├── CreateDSRPage.jsx
│   │   │   │   ├── CreateWSRPage.jsx
│   │   │   │   ├── CreateMSRPage.jsx
│   │   │   │   ├── ReportHistoryPage.jsx
│   │   │   │   └── ReportReviewPage.jsx    (manager)
│   │   │   ├── components/
│   │   │   │   ├── ReportForm.jsx
│   │   │   │   ├── DynamicFieldRenderer.jsx
│   │   │   │   ├── ReportCard.jsx
│   │   │   │   └── ReportStatusBadge.jsx
│   │   │   └── services/
│   │   │       └── reports.api.js
│   │   │
│   │   ├── ai/
│   │   │   ├── pages/
│   │   │   │   ├── AISuggestionsPage.jsx
│   │   │   │   ├── WeeklyAnalysisPage.jsx
│   │   │   │   └── MonthlyAnalysisPage.jsx
│   │   │   ├── components/
│   │   │   │   ├── AIPanel.jsx
│   │   │   │   ├── SuggestionCard.jsx
│   │   │   │   ├── ChatInterface.jsx
│   │   │   │   └── AnalysisReport.jsx
│   │   │   └── services/
│   │   │       └── ai.api.js
│   │   │
│   │   ├── templates/
│   │   │   ├── pages/
│   │   │   │   ├── TemplateListPage.jsx
│   │   │   │   └── TemplateBuilderPage.jsx
│   │   │   ├── components/
│   │   │   │   ├── TemplateCard.jsx
│   │   │   │   ├── FieldEditor.jsx
│   │   │   │   └── PreviewModal.jsx
│   │   │   └── services/
│   │   │       └── templates.api.js
│   │   │
│   │   ├── blockers/
│   │   │   ├── components/
│   │   │   │   ├── BlockerCard.jsx
│   │   │   │   └── BlockerForm.jsx
│   │   │   └── services/
│   │   │       └── blockers.api.js
│   │   │
│   │   ├── dashboard/
│   │   │   ├── pages/
│   │   │   │   ├── EmployeeDashboardPage.jsx
│   │   │   │   └── ManagerDashboardPage.jsx
│   │   │   └── components/
│   │   │       ├── StatsRow.jsx
│   │   │       ├── PendingReportBanner.jsx
│   │   │       └── ActivityFeed.jsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationPanel.jsx
│   │   │   │   └── NotificationBadge.jsx
│   │   │   └── services/
│   │   │       └── notifications.api.js
│   │   │
│   │   └── admin/
│   │       ├── pages/
│   │       │   ├── DepartmentPage.jsx
│   │       │   ├── MembersPage.jsx
│   │       │   └── OrgSettingsPage.jsx
│   │       └── services/
│   │           └── admin.api.js
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Badge.jsx
│   │       ├── Modal.jsx
│   │       ├── Spinner.jsx
│   │       ├── Toast.jsx
│   │       └── EmptyState.jsx
│   │
│   ├── services/
│   │   └── api.js              ← Axios instance + interceptors
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── AppContext.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useToast.js
│   │   └── useTenant.js
│   │
│   ├── router/
│   │   └── AppRouter.jsx
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## PHASE 7 — API REFERENCE

### Authentication

| Endpoint | Method | Auth | Body | Response |
|----------|--------|------|------|----------|
| `/auth/signup` | POST | No | `{name, email, password}` | `{user, message}` |
| `/auth/login` | POST | No | `{email, password}` | `{accessToken, user}` |
| `/auth/logout` | POST | Bearer | `{}` | `{message}` |
| `/auth/refresh` | POST | Cookie | `{}` | `{accessToken}` |
| `/auth/forgot-password` | POST | No | `{email}` | `{message}` |
| `/auth/reset-password` | POST | No | `{token, password}` | `{message}` |
| `/auth/mfa/setup` | POST | Bearer | `{}` | `{secret, qrCode, backupCodes}` |
| `/auth/mfa/verify-setup` | POST | Bearer | `{token}` | `{success}` |
| `/auth/mfa/verify` | POST | No | `{userId, token}` | `{accessToken}` |

### Work Goals

| Endpoint | Method | Auth | Body | Response |
|----------|--------|------|------|----------|
| `/api/goals/` | POST | Bearer | `{title, description, weekStart, assigneeId, parentId}` | `{goal}` |
| `/api/goals/` | GET | Bearer | `?weekStart=&status=&page=` | `{goals, total}` |
| `/api/goals/week/current` | GET | Bearer | — | `{goals}` |
| `/api/goals/pending` | GET | Bearer | — | `{goals}` |
| `/api/goals/:id/progress` | PATCH | Bearer | `{progress, note}` | `{goal}` |

### Work Reports

| Endpoint | Method | Auth | Body | Response |
|----------|--------|------|------|----------|
| `/api/work-reports/` | POST | Bearer | `{reportType, weekStart, content}` | `{report}` |
| `/api/work-reports/template/dsr` | GET | Bearer | — | `{template}` |
| `/api/work-reports/:id/submit` | POST | Bearer | `{}` | `{report}` |
| `/api/work-reports/:id/approve` | POST | Bearer | `{comment}` | `{report}` |
| `/api/work-reports/:id/reject` | POST | Bearer | `{reason}` | `{report}` |

### AI Analysis

| Endpoint | Method | Auth | Query | Response |
|----------|--------|------|-------|----------|
| `/ai/dsr/suggestions` | GET | Bearer | `?date=` | `{suggestions}` |
| `/ai/goals/recommendations` | GET | Bearer | `?weekStart=` | `{recommendations}` |
| `/ai/wsr/analysis` | GET | Bearer | `?weekStart=` | `{analysis}` |
| `/ai/msr/analysis` | GET | Bearer | `?month=&year=` | `{analysis}` |
| `/ai/assistant/query` | POST | Bearer | — | `{response}` |

---

## PHASE 9 — SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                 │
│   Employee App      Manager App      Admin App                  │
│   (React + Vite)    (React + Vite)   (React + Vite)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + JWT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Express.js)                     │
│   Rate Limiting | CORS | Helmet | Cookie Parser | Sanitize      │
│                                                                 │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐   │
│  │   /auth   │ │  /users  │ │  /tenants  │ │  /billing    │   │
│  └───────────┘ └──────────┘ └────────────┘ └──────────────┘   │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐   │
│  │  /api/*   │ │  /ai/*   │ │  /reports  │ │ /v1/integr.  │   │
│  └───────────┘ └──────────┘ └────────────┘ └──────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
┌─────────────────┐ ┌──────────┐  ┌────────────────┐
│    MongoDB      │ │  Redis   │  │  OpenAI API    │
│                 │ │          │  │                │
│  Users          │ │ Sessions │  │ GPT-4 Analysis │
│  Tenants        │ │ Queues   │  │ DSR Suggestions│
│  Goals          │ │ Cache    │  │ Goal Recs      │
│  Reports        │ │ Rate Lim │  └────────────────┘
│  Templates      │ └──────────┘
│  Notifications  │
│  Audit Logs     │         ┌─────────────────────┐
│  Integrations   │         │   Background Workers │
└─────────────────┘         │                     │
                            │  reportQueue.worker  │
                            │  reportScheduler     │
                            │  ai.queue            │
                            │  notification.pub    │
                            └─────────────────────┘
                                        │
                            ┌─────────────────────┐
                            │  External Services   │
                            │                     │
                            │  Stripe (Billing)   │
                            │  GitHub (OAuth)     │
                            │  SMTP (Email)       │
                            └─────────────────────┘

DATA FLOW:
──────────
1. Employee submits DSR → POST /api/work-reports/
2. Event fires → Notification to manager → notification.publisher
3. Manager reviews → POST /api/work-reports/:id/approve
4. AI analyzes → GET /ai/report/:id/analysis
5. Weekly AI summary → GET /ai/wsr/analysis
6. Goals carry-forward → POST /api/week-cycles/:id/carry-forward
```
