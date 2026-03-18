# Backend Architecture Report

## Scope

- Repository analyzed: `dsr/apps/api`, `dsr/packages/db`, `dsr/packages/infra`
- Requested HR appraisal module intentionally not implemented
- New API surface added under `/api/v1/*` with legacy `/api/*` aliases preserved

## Existing Modules

- Core auth: `auth`, `mfa`
- Tenancy: `tenant`, `membership`, `department`
- Work management: `workReports`, `workGoals`, `goals`, `weekCycles`, `blockers`, `task`, `taskTimeLog`
- Platform: `admin`, `audit`, `billing`, `notification`, `roles`, `support`, `templates`
- AI/reporting: `ai`, `goalAnalysis`, `reporting`, `reports`
- Infra integration: Redis cache/pubsub, BullMQ queues, Socket.IO WS server

## Request Lifecycle

1. `buildApp()` in [app.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/app/app.js) installs request logging, helmet, global rate limiting, CORS, cookies, JSON parsing, sanitization, then mounts routes.
2. `createRoutes()` in [index.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/routes/index.js) attaches module routers. The codebase historically mixed `/api/*`, `/reports`, and `/v1/*`; this pass standardizes API modules under `/api/v1/*` while keeping `/api/*`.
3. Authenticated routes use `authenticate()` to read the JWT access token from cookies and attach `req.user`.
4. Tenant-scoped modules generally use either `resolveTenant()` or `requireTenantMembership()` to derive tenant context, then optional RBAC middleware.
5. Controllers stay thin and delegate to service modules.
6. Services talk directly to Mongoose models. There is no true repository layer today.
7. Mutating services often call `recordAudit()` and sometimes emit events to the in-process event bus or Redis pub/sub.

## Controller / Service Pattern

- Controllers are mostly transport adapters: read `req.validated`, `req.user`, `req.params`, call a service, return JSON.
- Services own business rules, persistence, and audit calls.
- Several modules use transactions for multi-document flows: notably `workGoals`.
- Existing architecture claim of `controllers -> services -> repositories` does not match the current code. The real pattern is `controllers -> services -> Mongoose models`.

## Middleware Patterns

- Auth: [auth.middleware.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/auth.middleware.js)
- Tenant resolution: [tenant.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/tenant.js)
- Membership ownership checks: [requireTenantMembership.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/requireTenantMembership.js)
- RBAC permission checks: [rbac.middleware.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/modules/rbac/rbac.middleware.js)
- Validation: Zod via [validate.middleware.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/validate.middleware.js)
- Rate limiting: [rateLimit.middleware.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/rateLimit.middleware.js)
- Pagination middleware added in [pagination.middleware.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/middlewares/pagination.middleware.js)

## RBAC and Security Model

- Platform admins are enforced by `requireAdmin()`.
- Tenant RBAC resolves active `TenantMembership`, then loads `Role.permissions`.
- Tenant owners effectively bypass tenant permission checks through wildcard behavior.
- Security model is cookie-based JWT auth with tenant membership enforcement on most tenant resources.
- Security gap preserved from existing code: not every legacy route is consistently wrapped in RBAC middleware.
- Break-glass access is now audit logged via admin routes.
- Sensitive admin routes now use stricter endpoint rate limiting.

## Tenant Isolation

- Most tenant collections use the shared `tenantPlugin`.
- Services generally filter by `tenantId` before read/write operations.
- Isolation is enforced inconsistently at router level because some modules rely on `tenantId` in params while others rely on query/body/header resolution.
- This pass preserved those expectations to avoid breaking existing clients, but the next cleanup should normalize tenant context in one place.

## Database Relations

- `User` <-> `TenantMembership` <-> `Tenant`
- `TenantMembership` links users to role, department, manager, and reporting metrics
- `WorkReport` belongs to tenant + employee membership and references department/template/goals
- `WorkGoal` belongs to tenant + week cycle + department + assignee membership
- `Blocker` belongs to tenant and can reference tasks/goals/reports/users
- `Notification` and `NotificationPreference` support user and tenant scoped delivery
- `ApiKey` is tenant and user scoped, with only hashed key material stored

## Validation Patterns

- Zod schemas are colocated per module in `*.validation.js`
- Controllers usually consume `req.validated`
- Some legacy modules still use raw `req.body` or have commented-out validation/RBAC; several of those were restored in this pass for new endpoints

## Redis, Caching, and Pub/Sub

- Redis key and channel naming is centralized in [keys.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/packages/infra/src/cache/keys.js)
- Notification creation publishes `notification.created`
- Audit creation publishes `audit.created`
- Added `ws.broadcast` pub/sub for generic realtime event delivery
- Current caching strategy is light; Redis is used more for pub/sub, auth/session primitives, and queue infrastructure than broad response caching

## Worker Jobs and Eventing

- Existing queues: AI and maintenance queues in [queues.js](/c:/Users/vikas/OneDrive/Desktop/BabaTillu/dsr/apps/api/src/modules/events/queues.js)
- Existing default events: report submitted, blocker created
- Added scheduled maintenance jobs:
  - goal overdue detection
  - report deadline reminders
  - blocker SLA breach detection
  - tenant usage snapshots
  - data access grant expiry cleanup
- Added websocket event publishing for:
  - `report:submitted`
  - `report:approved`
  - `goal:assigned`
  - `blocker:escalated`
  - notification events continue through existing notification pub/sub

## New and Extended Modules

- New `dashboard` module
- New `analytics` module
- New `apiKeys` module
- Extended `workReports`, `notification`, `workGoals`, `blockers`, `membership`, `tenant`, `admin`

## Risks and Gaps

- Runtime verification was limited because importing several modules attempts Redis connections in this sandboxed environment.
- Some existing route semantics are non-uniform and still depend on `tenantId` coming from different request locations.
- The codebase still lacks a true repository abstraction despite the requested target architecture.
- Several legacy modules still need a broader RBAC normalization pass if strict enterprise consistency is required.
