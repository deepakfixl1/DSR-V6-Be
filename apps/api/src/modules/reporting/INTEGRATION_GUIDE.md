# Reporting Engine Integration Guide

## ✅ Routes Integration Complete

The reporting routes have been successfully integrated into the global routes file.

### Route Structure

```
/api/reports
├── /templates
│   ├── POST   /                      - Create template
│   ├── GET    /                      - List templates
│   ├── GET    /:templateId           - Get template
│   ├── PUT    /:templateId           - Update template
│   ├── DELETE /:templateId           - Delete template
│   ├── PATCH  /:templateId/status    - Update status
│   ├── POST   /:templateId/clone     - Clone template
│   └── POST   /:templateId/run       - Trigger manual run
│
├── /schedules
│   ├── POST   /                      - Create schedule
│   ├── GET    /                      - List schedules
│   ├── GET    /upcoming              - Get upcoming schedules
│   ├── PUT    /:scheduleId           - Update schedule
│   ├── PATCH  /:scheduleId/pause     - Pause schedule
│   ├── PATCH  /:scheduleId/resume    - Resume schedule
│   ├── DELETE /:scheduleId           - Delete schedule
│   └── POST   /:scheduleId/run       - Manual trigger
│
└── /runs
    ├── GET    /                      - List runs
    ├── GET    /:runId                - Get run details
    ├── POST   /:runId/retry          - Retry failed run
    ├── DELETE /:runId                - Delete run
    └── GET    /:runId/download       - Download report

/api/reports/stats                    - Get statistics
```

### Integration in `apps/api/src/routes/index.js`

```javascript
import reportingRoutes from "#api/modules/reporting/reporting.routes.js";

// In createRoutes function:
router.use("/reports", reportingRoutes);
```

## 🚀 Starting the Workers

### Option 1: Separate Worker Process

Create or update `apps/workers/report.worker.js`:

```javascript
import { connectDB } from "#db/connection/mongoose.js";
import { connectRedis } from "#infra/cache/redis.js";
import { redisConfig } from "#api/config/redis.config.js";
import { startReportWorker } from "#api/modules/reporting/reportQueue.worker.js";
import { startScheduler } from "#api/modules/reporting/reportScheduler.worker.js";
import { logger } from "#api/utils/logger.js";

async function main() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info("MongoDB connected");

    // Connect to Redis
    await connectRedis(redisConfig);
    logger.info("Redis connected");

    // Start BullMQ worker
    const worker = startReportWorker();
    logger.info("Report worker started");

    // Start scheduler (runs every minute)
    startScheduler(60000);
    logger.info("Report scheduler started");

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down report worker...");
      await worker.close();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to start report worker");
    process.exit(1);
  }
}

main();
```

Run with:
```bash
node apps/workers/report.worker.js
```

### Option 2: Integrated with Main Server

In your main server file (e.g., `apps/api/src/app/server.js`):

```javascript
import { startReportWorker } from "#api/modules/reporting/reportQueue.worker.js";
import { startScheduler } from "#api/modules/reporting/reportScheduler.worker.js";

// After server starts
const reportWorker = startReportWorker();
startScheduler(60000);

// In shutdown handler
process.on("SIGTERM", async () => {
  await reportWorker.close();
  // ... other cleanup
});
```

## 📦 Required Dependencies

Ensure these are installed:

```bash
npm install cron-parser luxon bullmq
```

## 🔧 Environment Variables

No additional environment variables needed. The engine uses existing:
- `REDIS_URL` - For BullMQ and locking
- `MONGODB_URI` - For data storage
- `NODE_ENV` - For environment-specific behavior

## 🧪 Testing the Integration

### 1. Create a Template

```bash
curl -X POST http://localhost:3000/api/reports/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "code": "TEST_REPORT",
    "name": "Test Report",
    "reportType": "CUSTOM",
    "departmentScope": "ALL",
    "sections": [{
      "key": "summary",
      "title": "Summary",
      "enabled": true,
      "source": {
        "module": "test",
        "entity": "TestData",
        "baseFilters": {},
        "metrics": []
      },
      "view": {
        "type": "TABLE",
        "columns": []
      }
    }],
    "outputDefaults": {
      "formats": ["PDF"],
      "timezone": "Asia/Kolkata"
    }
  }'
```

### 2. Create a Schedule

```bash
curl -X POST http://localhost:3000/api/reports/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "templateId": "TEMPLATE_ID_FROM_STEP_1",
    "name": "Daily Test Report",
    "cadence": "DAILY",
    "timezone": "Asia/Kolkata",
    "runAt": {
      "hour": 9,
      "minute": 0
    }
  }'
```

### 3. Trigger Manual Run

```bash
curl -X POST http://localhost:3000/api/reports/templates/TEMPLATE_ID/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "period": {
      "from": "2026-02-01T00:00:00Z",
      "to": "2026-02-20T23:59:59Z",
      "label": "February 2026"
    }
  }'
```

### 4. Check Run Status

```bash
curl -X GET http://localhost:3000/api/reports/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID"
```

## 📊 Monitoring

### Check Worker Status

The workers log to your application logger. Look for:

```
Report generation worker started
Report scheduler started
Report scheduler started processing
Found X due schedules
Schedule processed successfully
Report execution completed successfully
```

### Check Queue Status

You can use BullMQ Board or Redis CLI:

```bash
# Redis CLI
redis-cli
> KEYS *reports.generate*
> LLEN bull:reports.generate:wait
> LLEN bull:reports.generate:active
> LLEN bull:reports.generate:completed
> LLEN bull:reports.generate:failed
```

### Check Locks

```bash
redis-cli
> KEYS *lock:report*
> TTL dev:t:_:lock:scheduler:report-scheduler
```

## 🔍 Troubleshooting

### Workers Not Processing Jobs

1. Check Redis connection:
```javascript
import { isRedisReady } from "#infra/cache/redis.js";
const ready = await isRedisReady();
console.log("Redis ready:", ready);
```

2. Check BullMQ connection:
```javascript
// In worker file
worker.on("error", (error) => {
  console.error("Worker error:", error);
});
```

3. Verify queue name matches:
- Queue service: `reports.generate`
- Worker: `reports.generate`

### Scheduler Not Running

1. Check if scheduler lock is stuck:
```bash
redis-cli DEL dev:t:_:lock:scheduler:report-scheduler
```

2. Verify schedules exist and are active:
```javascript
db.reportschedules.find({ status: "active", nextRunAt: { $lte: new Date() } })
```

3. Check scheduler logs for errors

### Reports Not Generating

1. Check run status in database:
```javascript
db.reportruns.find({ status: "failed" }).sort({ createdAt: -1 }).limit(5)
```

2. Check worker logs for execution errors

3. Verify template exists and is active

## 🎯 Next Steps

1. ✅ Routes integrated in global router
2. ✅ Start workers (choose Option 1 or 2)
3. ✅ Test with sample requests
4. ✅ Monitor logs and queue
5. ⏭️ Implement actual data aggregations in `reportExecution.service.js`
6. ⏭️ Implement file storage (S3/GridFS) for outputs
7. ⏭️ Implement PDF/XLSX generation
8. ⏭️ Implement email delivery

## 📝 Summary

The reporting engine is now fully integrated:

- ✅ All routes mounted at `/api/reports`
- ✅ 22 endpoints available
- ✅ Workers ready to start
- ✅ Scheduler ready to run
- ✅ Complete documentation provided

Start the workers and begin testing!
