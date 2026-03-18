# AI Report Generation Flow

This explains how DSR/Weekly/Monthly/Quarterly/Yearly reports are generated.

## 1. API Request

Client calls:
- `POST /api/ai/report/dsr`
- `POST /api/ai/report/weekly`
- `POST /api/ai/report/monthly`
- `POST /api/ai/report/quarterly`
- `POST /api/ai/report/yearly`

The controller:
1. Validates payload.
2. Checks plan limits + AI quota.
3. Resolves `TenantMembership._id` for the current user.
4. Enqueues a BullMQ job with `{ tenantId, userId, memberId, params }`.

## 2. Worker Processing

Worker: `apps/workers/report.worker.js`

Steps:
1. Connects to Mongo and Redis.
2. Runs OpenAI health check before processing jobs.
3. Resolves `memberId` if missing (tenant + user -> membership).
4. Creates a temporary AIReport (status: processing).
5. Calls the AI report service for the specific report type.
6. Deletes the temporary report after service persists final output.

## 3. AI Report Service

Service: `apps/api/src/modules/reporting/report.ai.service.js`

Steps:
1. Checks cache/AIInsight to avoid regeneration.
2. Loads tenant data (tasks, activities, audit logs).
3. Calls `executeAI` (OpenAI) with structured JSON schema.
4. Persists AIReport with:
   - `generatedBy` (User._id)
   - `generatedByMemberId` (TenantMembership._id)
5. Stores AIInsight and links `aiInsightId` in AIReport.

## 4. Storage

- `AIReport` stores report output and metadata.
- `AIInsight` stores the generated AI output (cached).
- `AIExecutionLog` stores prompt/response for audit trail.

## 5. Why TenantMemberId?

Tasks are assigned by `TenantMembership._id`, not `User._id`.  
For report + AI queries, `memberId` is resolved from `{ tenantId, userId }`
and used for:
- Tracking report ownership
- Consistent task assignment references

