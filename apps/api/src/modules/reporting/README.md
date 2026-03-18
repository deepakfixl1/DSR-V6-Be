# AI Reporting Intelligence Layer

Enterprise-grade AI-powered reporting engine with multi-tenant isolation, plan-based restrictions, and comprehensive governance.

## Architecture Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    API Layer (Express)                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  report.ai.controller.js - HTTP Request Handlers     â”‚  â”‚
â”‚  â”‚  report.ai.routes.js - Route Definitions             â”‚  â”‚
â”‚  â”‚  report.validation.js - Zod Validation Schemas       â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Service Layer                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  report.ai.service.js - Core Report Generation       â”‚  â”‚
â”‚  â”‚  report.export.service.js - PDF/CSV/JSON Export      â”‚  â”‚
â”‚  â”‚  report.cache.service.js - Redis Caching             â”‚  â”‚
â”‚  â”‚  report.queue.service.js - BullMQ Job Management     â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   AI Service (Central)                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  ai.service.js - OpenAI API Integration              â”‚  â”‚
â”‚  â”‚  - Token tracking                                     â”‚  â”‚
â”‚  â”‚  - Prompt sanitization                                â”‚  â”‚
â”‚  â”‚  - Execution logging                                  â”‚  â”‚
â”‚  â”‚  - Quota enforcement                                  â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  Background Workers                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  report.worker.js - Report Generation Queue          â”‚  â”‚
â”‚  â”‚  export.worker.js - Export Processing Queue          â”‚  â”‚
â”‚  â”‚  report.scheduler.js - Cron-based Automation         â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Data Layer                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  MongoDB: AIReport, AIInsight, AIRecommendation      â”‚  â”‚
â”‚  â”‚  Redis: Caching, Job Queues                          â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Report Types

### 1. Daily Status Report (DSR)
- **Trigger**: Scheduled daily at 6 AM + On-demand
- **Plan**: Free, Pro, Enterprise
- **Processing Time**: 30-60 seconds
- **Data Analyzed**: 
  - Tasks completed yesterday
  - Overdue tasks
  - New tasks created
  - Blocked tasks
  - Team activity logs

**AI Output**:
- Executive summary
- Key achievements
- Critical blockers
- Risk assessment (low/medium/high)
- Next day focus recommendations

**Endpoints**:
```
POST /api/ai/report/dsr
GET  /api/ai/report/dsr/latest
```

### 2. Weekly Team Report
- **Trigger**: Every Monday at 7 AM + On-demand
- **Plan**: Pro, Enterprise
- **Processing Time**: 1-2 minutes
- **Data Analyzed**:
  - Weekly velocity
  - Completion rate
  - Workload distribution
  - Team activities

**AI Output**:
- Team performance summary
- Velocity analysis
- Burnout risk detection
- Workload imbalance alerts
- Resource allocation recommendations

**Endpoints**:
```
POST /api/ai/report/weekly
```

### 3. Monthly Performance Report
- **Trigger**: 1st of month at 8 AM + On-demand
- **Plan**: Pro, Enterprise
- **Processing Time**: 2-3 minutes
- **Data Analyzed**:
  - Monthly KPIs
  - Task completion trends
  - Priority distribution
  - Audit events

**AI Output**:
- Executive summary
- Trend analysis (growth/decline)
- Performance highlights
- Weak areas identification
- Improvement suggestions
- Next month forecast

**Endpoints**:
```
POST /api/ai/report/monthly
```

### 4. Yearly Strategic Intelligence Report
- **Trigger**: January 1st at 9 AM + On-demand
- **Plan**: Enterprise ONLY
- **Processing Time**: 5-10 minutes
- **Data Analyzed**:
  - All yearly tasks
  - Security events
  - AI usage patterns
  - Audit logs
  - Monthly breakdown

**AI Output**:
- Executive narrative
- Year-over-year comparison
- Strategic risks
- Operational inefficiencies
- Next year forecast
- Investment recommendations
- Scaling suggestions
- Security maturity score (0-100)
- Cost optimization insights
- Top 5 strategic priorities

**Endpoints**:
```
POST /api/ai/report/yearly
```

## API Reference

### Generate DSR
```http
POST /api/ai/report/dsr
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-02-20" // optional, defaults to today
}

Response (202 Accepted):
{
  "success": true,
  "message": "DSR generation started",
  "jobId": "job-123",
  "estimatedTime": "30-60 seconds"
}
```

### Get Latest DSR
```http
GET /api/ai/report/dsr/latest
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "report-id",
    "reportType": "DSR",
    "narrative": "...",
    "summary": { ... },
    "risks": [ ... ],
    "metrics": { ... },
    "confidenceScore": 0.87
  }
}
```

### Check Report Status
```http
GET /api/ai/report/status/:jobId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "status": "completed",
    "reportId": "report-id",
    "reportType": "DSR",
    "completedAt": "2026-02-20T06:15:30Z"
  }
}
```

### Get Report History
```http
GET /api/ai/report/history?reportType=DSR&limit=20&page=1
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Export Report
```http
POST /api/ai/report/export/:reportId
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "PDF" // or "CSV", "JSON"
}

Response (202 Accepted):
{
  "success": true,
  "message": "Export started",
  "jobId": "export-job-123"
}
```

## Plan Restrictions

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| DSR | âœ… | âœ… | âœ… |
| Weekly Report | âŒ | âœ… | âœ… |
| Monthly Report | âŒ | âœ… | âœ… |
| Yearly Strategic Report | âŒ | âŒ | âœ… |
| Forecast Included | âŒ | âœ… | âœ… |
| Security Deep Insights | âŒ | âŒ | âœ… |
| AI Trend Comparison | âŒ | âŒ | âœ… |
| Max AI Tokens/Month | 10,000 | 100,000 | 1,000,000 |
| Max Reports/Month | 30 | 200 | Unlimited |

## Caching Strategy

### Redis Cache Keys
```
ai:report:{tenantId}:{reportType}:{period}
ai:summary:{tenantId}:daily:{date}
ai:report:{tenantId}:yearly:{year}
```

### Cache TTL
- DSR: 1 hour
- Weekly: 24 hours
- Monthly: 7 days
- Yearly: 30 days

## Background Processing

### BullMQ Queues

**ai-report-generation**
- Concurrency: 2
- Rate Limit: 10 jobs/minute
- Retry: 3 attempts with exponential backoff

**ai-report-export**
- Concurrency: 5
- Rate Limit: 20 exports/minute
- Retry: 2 attempts with fixed backoff

### Workers

Start workers:
```bash
# Report generation worker
npm run worker:report

# Export worker
npm run worker:export
```

## AI Governance

### Token Tracking
Every AI execution logs:
- `tokensUsed`: Total tokens consumed
- `costEstimate`: Estimated cost
- `modelVersion`: OpenAI model used
- `dataScope`: Amount of data analyzed
- `confidenceScore`: AI confidence (0-1)

### Explainability
Each report includes:
- `reasoning`: Summary of AI reasoning
- `keySignals`: Data signals used
- `dataQuality`: high/medium/low

### Quota Enforcement
```javascript
// Check before AI execution
const quota = await checkAIQuota(tenantId, planLimits);
if (!quota.allowed) {
  throw new ApiError(429, "AI quota exceeded");
}
```

## Scheduler Configuration

### Cron Schedules
```javascript
// DSR - Daily at 6 AM
cron.schedule("0 6 * * *", generateDSRForAllTenants);

// Weekly - Monday at 7 AM
cron.schedule("0 7 * * 1", generateWeeklyReports);

// Monthly - 1st of month at 8 AM
cron.schedule("0 8 1 * *", generateMonthlyReports);

// Yearly - January 1st at 9 AM
cron.schedule("0 9 1 1 *", generateYearlyReports);
```

### Initialize Schedulers
```javascript
import { initializeReportSchedulers } from "./report.scheduler.js";

// In server.js
initializeReportSchedulers();
```

## Database Models

### AIReport
```javascript
{
  tenantId: ObjectId,
  reportType: "DSR" | "WEEKLY" | "MONTHLY" | "YEARLY",
  generatedBy: ObjectId,
  status: "pending" | "processing" | "completed" | "failed",
  period: { start: Date, end: Date },
  narrative: String,
  summary: Mixed,
  risks: [Mixed],
  recommendations: [Mixed],
  forecast: Mixed,
  trends: Mixed,
  metrics: Mixed,
  tokensUsed: Number,
  confidenceScore: Number,
  explainability: {
    reasoning: String,
    keySignals: [String],
    dataQuality: "high" | "medium" | "low"
  },
  exports: [{
    format: "PDF" | "CSV" | "JSON",
    fileUrl: String,
    generatedAt: Date
  }]
}
```

## Error Handling

### Common Errors
- `429`: AI quota exceeded
- `403`: Plan restriction (e.g., Free plan accessing Weekly report)
- `404`: Report not found
- `500`: AI execution failed

### Retry Logic
- Report generation: 3 attempts with exponential backoff
- Export: 2 attempts with fixed backoff
- Failed jobs stored for debugging

## Performance Optimization

### Efficient Data Fetching
```javascript
// Parallel data fetching
const [tasks, activities, logs] = await Promise.all([
  Task.find(query).lean(),
  TaskActivity.find(query).lean(),
  AuditLog.find(query).limit(1000).lean()
]);
```

### Prompt Optimization
- Concise data summaries
- Structured JSON schemas
- Token-efficient formatting
- Max 50k chars per prompt

### Caching Strategy
- Cache completed reports
- Invalidate on new data
- Tenant-specific cache keys

## Security

### Multi-Tenant Isolation
- All queries include `tenantId`
- User permissions checked
- Plan restrictions enforced

### Prompt Sanitization
```javascript
function sanitizePrompt(prompt) {
  return prompt.trim().slice(0, 50000);
}
```

### Rate Limiting
- API endpoints: Standard rate limits
- AI execution: Plan-based quotas
- Queue processing: Concurrency limits

## Monitoring

### Logs
```javascript
logger.info("Report generated", { 
  tenantId, 
  reportId, 
  type, 
  tokensUsed 
});
```

### Metrics to Track
- Reports generated per day
- Average processing time
- Token consumption
- Cache hit rate
- Queue depth
- Error rate

## Future Enhancements

1. **Quarterly Reports**: Between Monthly and Yearly
2. **Custom Report Builder**: User-defined report templates
3. **Real-time Streaming**: WebSocket-based progress updates
4. **Multi-language Support**: Reports in different languages
5. **Advanced Visualizations**: Charts and graphs in exports
6. **Email Delivery**: Automated report distribution
7. **Slack/Teams Integration**: Push reports to channels
8. **Comparative Analysis**: Compare periods side-by-side
9. **Anomaly Alerts**: Real-time notifications for critical issues
10. **AI Model Selection**: Choose between different AI models

## Testing

### Unit Tests
```bash
npm test -- report.ai.service.test.js
```

### Integration Tests
```bash
npm test -- report.integration.test.js
```

### Load Tests
```bash
npm run test:load -- report-generation
```

## Deployment

### Environment Variables
```env
OpenAI_API_KEY=your-api-key
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/db
```

### Start Services
```bash
# API Server
npm start

# Workers
npm run worker:report
npm run worker:export

# WebSocket Server (optional)
npm run ws
```

## Support

For issues or questions:
- Check logs: `apps/api/logs/`
- Review queue status: Redis Commander
- Monitor database: MongoDB Compass
- Contact: ai-support@company.com
