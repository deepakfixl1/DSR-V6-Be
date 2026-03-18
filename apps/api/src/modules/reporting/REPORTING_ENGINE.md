# Enterprise Reporting Engine

Production-ready reporting engine for multi-tenant SaaS applications with scheduled report generation, BullMQ job processing, Redis locking, and comprehensive audit logging.

## Architecture Overview

### Components

1. **Report Templates** - Define report structure, data sources, and output formats
2. **Report Schedules** - Configure automated report generation with cron-like scheduling
3. **Report Runs** - Track individual report execution instances
4. **Report Execution Service** - Core logic for generating reports with safe aggregations
5. **BullMQ Worker** - Background job processor with Redis locking
6. **Scheduler Worker** - Cron-style scheduler that triggers scheduled reports
7. **Queue Service** - Job enqueueing with retry logic

## API Endpoints

### Base URL: `/api/reports`

### Template Management

```
POST   /templates                    - Create template (reports.create)
PUT    /templates/:templateId        - Update template (reports.edit)
GET    /templates/:templateId        - Get template (reports.view)
GET    /templates                    - List templates (reports.view)
DELETE /templates/:templateId        - Delete template (reports.delete)
PATCH  /templates/:templateId/status - Update status (reports.edit)
POST   /templates/:templateId/clone  - Clone template (reports.create)
```

### Schedule Management

```
POST   /schedules                    - Create schedule (reports.schedule)
PUT    /schedules/:scheduleId        - Update schedule (reports.schedule)
PATCH  /schedules/:scheduleId/pause  - Pause schedule (reports.schedule)
PATCH  /schedules/:scheduleId/resume - Resume schedule (reports.schedule)
DELETE /schedules/:scheduleId        - Delete schedule (reports.delete)
GET    /schedules                    - List schedules (reports.view)
GET    /schedules/upcoming           - Get upcoming schedules (reports.view)
POST   /schedules/:scheduleId/run    - Trigger manual run (reports.run)
```

### Run Management

```
POST   /templates/:templateId/run    - Trigger manual run (reports.run)
GET    /runs                         - List runs (reports.view)
GET    /runs/:runId                  - Get run details (reports.view)
POST   /runs/:runId/retry            - Retry failed run (reports.run)
DELETE /runs/:runId                  - Delete run (reports.delete)
GET    /runs/:runId/download         - Download report (reports.export)
```

### Dashboard

```
GET    /stats                        - Get report statistics (reports.view)
```

## RBAC Permissions

- `reports.create` - Create templates
- `reports.edit` - Edit templates
- `reports.delete` - Delete templates/schedules/runs
- `reports.view` - View templates/schedules/runs
- `reports.schedule` - Create/manage schedules
- `reports.run` - Trigger manual runs
- `reports.export` - Download reports

## Features

### Multi-Tenant Isolation

- Every query includes `tenantId` filter
- No cross-tenant data access
- Tenant-scoped Redis locks

### Safe Aggregation Builder

- Sanitizes user-provided filters
- Blocks dangerous MongoDB operators
- Enforces tenant isolation in pipelines
- Validates scope restrictions

### Scheduling

Supported cadences:
- `DAILY` - Every day at specified time
- `WEEKLY` - Specific day of week
- `MONTHLY` - Specific day of month
- `QUARTERLY` - Specific day in quarter
- `YEARLY` - Specific date annually
- `CRON` - Custom cron expression

### Redis Locking

- Scheduler lock prevents duplicate processing
- Per-schedule locks prevent concurrent runs
- Per-run locks prevent duplicate execution
- Automatic lock expiration (TTL)

### BullMQ Integration

- Queue: `reports.generate`
- Max 3 retry attempts with exponential backoff
- Concurrency: 5 workers
- Rate limit: 10 jobs/minute
- Job deduplication via Redis locks

### Audit Logging

Events logged:
- `REPORT_TEMPLATE_CREATED`
- `REPORT_TEMPLATE_UPDATED`
- `REPORT_TEMPLATE_DELETED`
- `REPORT_SCHEDULE_CREATED`
- `REPORT_SCHEDULE_UPDATED`
- `REPORT_SCHEDULE_DELETED`
- `REPORT_RUN_TRIGGERED`
- `REPORT_RUN_SUCCESS`
- `REPORT_RUN_FAILED`

Each log includes:
- tenantId
- userId
- ipAddress
- userAgent
- timestamp
- metadata

### Notifications

Triggers sent via Redis Pub/Sub:
- Report generation success
- Report generation failure
- Schedule creation
- Schedule pause/resume

### Rate Limiting

- Manual runs: 50 per tenant per hour
- Concurrent runs: 10 per tenant
- Period validation: Max 1 year range

### Error Handling

- Centralized error middleware
- No stack traces in production
- Structured error responses
- Worker error recovery

## Data Models

### ReportTemplate

```javascript
{
  tenantId: ObjectId,
  code: String,              // Unique per tenant
  name: String,
  reportType: Enum,
  departmentScope: Enum,     // ALL | SELECTED
  departmentIds: [ObjectId],
  sections: [{
    key: String,
    title: String,
    source: {
      module: String,
      entity: String,
      baseFilters: Object,
      groupBy: Object,
      metrics: [Object]
    },
    view: {
      type: Enum,            // TABLE | CHART | TEXT | KPI | LIST
      columns: [Object]
    }
  }],
  outputDefaults: {
    formats: [String],       // PDF | XLSX | CSV | JSON | HTML
    timezone: String,
    locale: String
  },
  status: Enum               // active | disabled
}
```

### ReportSchedule

```javascript
{
  tenantId: ObjectId,
  templateId: ObjectId,
  name: String,
  status: Enum,              // active | paused | disabled
  cadence: Enum,             // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY | CRON
  cronExpr: String,
  timezone: String,
  nextRunAt: Date,
  lastRunAt: Date,
  scope: {
    type: Enum,              // TENANT | DEPARTMENT | TEAM | USER | CUSTOM
    departmentId: ObjectId,
    teamId: ObjectId,
    userId: ObjectId
  },
  delivery: {
    channels: [String],      // IN_APP | EMAIL | SLACK | WEBHOOK
    recipients: Object
  }
}
```

### ReportRun

```javascript
{
  tenantId: ObjectId,
  templateId: ObjectId,
  scheduleId: ObjectId,
  period: {
    from: Date,
    to: Date,
    label: String
  },
  scopeSnapshot: Object,
  outputs: [{
    format: String,
    file: {
      storage: String,       // S3 | LOCAL | GRIDFS
      path: String,
      sizeBytes: Number
    }
  }],
  status: Enum,              // queued | running | success | failed
  job: {
    jobId: String,
    attempts: Number,
    startedAt: Date,
    finishedAt: Date,
    durationMs: Number
  },
  triggerType: Enum          // manual | schedule | api
}
```

## Usage Examples

### Create a Template

```javascript
POST /api/reports/templates
{
  "code": "DSR_ENGINEERING",
  "name": "Daily Status Report - Engineering",
  "reportType": "DSR",
  "departmentScope": "SELECTED",
  "departmentIds": ["dept123"],
  "sections": [{
    "key": "tasks",
    "title": "Task Summary",
    "enabled": true,
    "source": {
      "module": "tasks",
      "entity": "Task",
      "baseFilters": { "status": "completed" },
      "metrics": [{ "field": "count", "op": "count" }]
    },
    "view": {
      "type": "TABLE",
      "columns": [{ "key": "title", "label": "Task" }]
    }
  }],
  "outputDefaults": {
    "formats": ["PDF", "XLSX"],
    "timezone": "Asia/Kolkata"
  }
}
```

### Create a Schedule

```javascript
POST /api/reports/schedules
{
  "templateId": "template123",
  "name": "Daily Engineering Report",
  "cadence": "DAILY",
  "timezone": "Asia/Kolkata",
  "runAt": { "hour": 9, "minute": 0 },
  "scope": {
    "type": "DEPARTMENT",
    "departmentId": "dept123"
  },
  "delivery": {
    "channels": ["EMAIL", "IN_APP"],
    "recipients": {
      "emails": ["team@example.com"]
    }
  }
}
```

### Trigger Manual Run

```javascript
POST /api/reports/templates/template123/run
{
  "period": {
    "from": "2026-02-01T00:00:00Z",
    "to": "2026-02-20T23:59:59Z",
    "label": "February 2026"
  },
  "scope": {
    "type": "DEPARTMENT",
    "departmentId": "dept123"
  },
  "output": {
    "formats": ["PDF"]
  }
}
```

## Worker Setup

### Start BullMQ Worker

```javascript
import { startReportWorker } from './reportQueue.worker.js';

const worker = startReportWorker();

process.on('SIGTERM', async () => {
  await worker.close();
});
```

### Start Scheduler

```javascript
import { startScheduler } from './reportScheduler.worker.js';

// Run every minute
startScheduler(60000);
```

## Security Considerations

1. **No Raw Mongo Operators** - All filters are sanitized
2. **Tenant Isolation** - Every query includes tenantId
3. **RBAC Enforcement** - All routes protected
4. **Rate Limiting** - Prevents abuse
5. **Input Validation** - Zod schemas on all endpoints
6. **Redis Locks** - Prevents race conditions
7. **Audit Logging** - Complete audit trail

## Performance Optimizations

1. **Pagination** - All list endpoints paginated
2. **Indexes** - Optimized MongoDB indexes
3. **Redis Caching** - Lock-based deduplication
4. **BullMQ Concurrency** - Parallel job processing
5. **Aggregation Limits** - Configurable result limits

## Monitoring

### Logs

All operations logged with structured data:
- Template CRUD operations
- Schedule processing
- Report execution
- Worker errors
- Lock acquisition failures

### Metrics

Track:
- Report success rate
- Average execution time
- Queue depth
- Failed runs
- Concurrent runs per tenant

## Future Enhancements

- [ ] S3/GridFS file storage integration
- [ ] PDF/XLSX generation
- [ ] Email delivery integration
- [ ] Slack webhook integration
- [ ] Report templates marketplace
- [ ] Advanced chart rendering
- [ ] Report sharing/permissions
- [ ] Report versioning
- [ ] Data export streaming
- [ ] Report preview/draft mode
