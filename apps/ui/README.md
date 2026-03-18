# DSR Platform UI

## Page Hierarchy
- /login
- /register
- /verify-email
- /mfa
- /forgot
- /reset
- /account/profile
- /account/sessions
- /tenants
- /tenants/:tenantId
- /tenants/:tenantId/tasks
- /tenants/:tenantId/dsr
- /tenants/:tenantId/reports
- /tenants/:tenantId/members
- /tenants/:tenantId/ai
- /tenants/:tenantId/settings
- /tenants/:tenantId/settings/api
- /tenants/:tenantId/billing
- /tenants/:tenantId/audit
- /tenants/:tenantId/manager-review
- /ai
- /ai/report

## Component Tree (Core)
- App
- AuthLayout
- TenantLayout
- Sidebar
- Topbar
- Cards
- KPI Grid
- SplitPane
- Tabs
- DataTable
- ChartPlaceholder
- API Console

## State Flow
- AuthContext
- user, role, tenants, activeTenantId
- Topbar updates role and triggers UI re-render for role-based nav
- TenantSwitcher sets activeTenantId and routes into tenant scope
- ThemeContext toggles light/dark mode and persists to localStorage
- Pages call API modules for data and fall back to local mock data
- Notifications poll every 20s to show soft real-time updates

## API Coverage
All API endpoints are represented in `src/api/*.js` and surfaced in the in-app API Console at `/tenants/:tenantId/settings/api`.
