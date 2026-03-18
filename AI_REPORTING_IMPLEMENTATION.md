# AI Reporting Intelligence Layer - Implementation Guide

## ðŸŽ¯ Overview

This is a production-ready, enterprise-grade AI reporting engine integrated into your multi-tenant SaaS platform. It provides automated, intelligent reporting with:

- âœ… Multi-tenant isolation
- âœ… Plan-based restrictions (Free/Pro/Enterprise)
- âœ… Central AIService (no direct OpenAI calls)
- âœ… Token tracking & quota enforcement
- âœ… Redis caching
- âœ… MongoDB persistence
- âœ… BullMQ async processing
- âœ… Cron-based scheduling
- âœ… Export to PDF/CSV/JSON
- âœ… Explainability & governance

## ðŸ“ Files Created

### Core Services
```
apps/api/src/modules/ai/
â”œâ”€â”€ ai.service.js              # Central AI service (OpenAI integration)
â””â”€â”€ ai.model.js                # Updated with all AI types

apps/api/src/modules/reporting/
â”œâ”€â”€ report.ai.service.js       # Report generation logic
â”œâ”€â”€ report.ai.controller.js    # HTTP controllers
â”œâ”€â”€ report.ai.routes.js        # Express routes
â”œâ”€â”€ report.validation.js       # Zod validation schemas
â”œâ”€â”€ report.queue.service.js    # BullMQ job management
â”œâ”€â”€ report.cache.service.js    # Redis caching
â”œâ”€â”€ report.export.service.js   # PDF/CSV/JSON export
â”œâ”€â”€ report.scheduler.js        # Cron schedulers
â””â”€â”€ README.md                  # Documentation
```

### Workers
```
apps/workers/
â”œâ”€â”€ report.worker.js           # Report generation worker
â””â”€â”€ export.worker.js           # Export processing worker
```

### Models
```
packages/db/src/models/
â”œâ”€â”€ AIReport.model.js          # New: AI report storage
â”œâ”€â”€ AIInsight.model.js         # Existing: Updated usage
â”œâ”€â”€ AIRecommendation.model.js  # Existing: Updated usage
â”œâ”€â”€ AIUsage.model.js           # Existing: Token tracking
â”œâ”€â”€ AIExecutionLog.model.js    # Existing: Execution logs
â””â”€â”€ index.js                   # Updated: Export AIReport
```

### Configuration
```
apps/api/src/routes/index.js   # Updated: Added report routes
apps/api/src/app/server.js     # Updated: Scheduler initialization
package.json                   # Updated: Added node-cron, worker scripts
packages/db/src/models/PlanCatalog.model.js  # Updated: AI limits
```

## ðŸš€ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Add to `.env`:
```env
OpenAI_API_KEY=your-OpenAI-api-key
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/your-db
```

### 3. Start Services
```bash
# Terminal 1: API Server (includes schedulers)
npm start

# Terminal 2: Report Worker
npm run worker:report

# Terminal 3: Export Worker
npm run worker:export
```

### 4. Test API
```bash
# Generate DSR
curl -X POST http://localhost:3000/api/ai/report/dsr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-02-20"}'

# Get latest DSR
curl http://localhost:3000/api/ai/report/dsr/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ðŸ“Š Report Types

### 1. Daily Status Report (DSR)
**Purpose**: Daily team activity summary

**Schedule**: Every day at 6 AM

**Data Analyzed**:
- Completed tasks (yesterday)
- Overdue tasks
- New tasks created
- Blocked tasks
- Team activities

**AI Output**:
```json
{
  "summary": "Team completed 12 tasks with 3 critical blockers...",
  "achievements": [
    "Completed authentication module",
    "Fixed 5 critical bugs"
  ],
  "blockers": [
    "API integration blocked by vendor",
    "Database migration pending approval"
  ],
  "riskLevel": "medium",
  "nextDayFocus": [
    "Resolve API integration blocker",
    "Complete pending code reviews"
  ],
  "confidence": 0.87
}
```

**API**:
```javascript
POST /api/ai/report/dsr
Body: { "date": "2026-02-20" }
```

### 2. Weekly Team Report
**Purpose**: Team performance & burnout detection

**Schedule**: Every Monday at 7 AM

**Plan**: Pro or Enterprise

**Data Analyzed**:
- Weekly velocity
- Completion rate
- Workload distribution
- Team activities

**AI Output**:
```json
{
  "summary": "Team velocity increased 15% this week...",
  "velocityAnalysis": "Completion rate improved from 72% to 85%...",
  "burnoutRisks": [
    {
      "userId": "user-123",
      "riskLevel": "high",
      "reason": "Assigned 25 tasks, 3x team average"
    }
  ],
  "workloadImbalance": true,
  "recommendations": [
    "Redistribute tasks from user-123 to user-456",
    "Consider hiring additional backend developer"
  ],
  "confidence": 0.82
}
```

**API**:
```javascript
POST /api/ai/report/weekly
Body: { "weekStart": "2026-02-17" }
```

### 3. Monthly Performance Report
**Purpose**: KPI tracking & trend analysis

**Schedule**: 1st of month at 8 AM

**Plan**: Pro or Enterprise

**Data Analyzed**:
- Monthly KPIs
- Task completion trends
- Priority distribution
- Audit events

**AI Output**:
```json
{
  "summary": "Monthly performance shows 12% improvement...",
  "trends": {
    "taskVolumeTrend": "increasing",
    "completionRateTrend": "improving",
    "analysis": "Task volume increased 20% while maintaining 85% completion rate"
  },
  "highlights": [
    "Highest completion rate in 6 months",
    "Zero critical bugs in production"
  ],
  "weakAreas": [
    "Code review turnaround time increased to 3 days",
    "Documentation coverage dropped to 65%"
  ],
  "improvements": [
    "Implement automated code review reminders",
    "Allocate 2 hours/week for documentation"
  ],
  "forecast": {
    "nextMonthCompletionRate": 87,
    "nextMonthTaskVolume": 450,
    "confidence": 0.78
  },
  "risks": [
    {
      "type": "capacity",
      "severity": "medium",
      "description": "Team at 95% capacity, may impact quality"
    }
  ],
  "confidence": 0.85
}
```

**API**:
```javascript
POST /api/ai/report/monthly
Body: { "monthStart": "2026-02-01" }
```

### 4. Yearly Strategic Intelligence Report
**Purpose**: Executive-level strategic insights

**Schedule**: January 1st at 9 AM

**Plan**: Enterprise ONLY

**Data Analyzed**:
- All yearly tasks
- Security events
- AI usage patterns
- Audit logs
- Monthly breakdown

**AI Output**:
```json
{
  "executiveNarrative": "2025 marked significant growth with 45% increase in productivity...",
  "yoyComparison": {
    "growth": "45% increase in task completion",
    "keyChanges": [
      "Implemented AI-driven task assignment",
      "Reduced average completion time by 30%"
    ]
  },
  "strategicRisks": [
    {
      "risk": "Technical debt accumulation",
      "severity": "high",
      "mitigation": "Allocate 20% sprint capacity to refactoring"
    }
  ],
  "inefficiencies": [
    "Manual deployment process adds 2 hours per release",
    "Duplicate work across teams due to poor communication"
  ],
  "forecast": {
    "nextYearTaskVolume": 5400,
    "nextYearCompletionRate": 88,
    "growthRate": 25,
    "confidence": 0.75
  },
  "investments": [
    "CI/CD automation platform ($50k)",
    "Team collaboration tools ($20k)",
    "AI-powered code review system ($30k)"
  ],
  "scalingSuggestions": [
    "Hire 2 senior engineers to support 30% growth",
    "Implement microservices architecture for scalability"
  ],
  "securityMaturityScore": 78,
  "costOptimization": [
    "Migrate to serverless for 40% cost reduction",
    "Optimize database queries to reduce compute costs"
  ],
  "strategicPriorities": [
    "Automate deployment pipeline",
    "Reduce technical debt by 50%",
    "Improve cross-team collaboration",
    "Enhance security posture to 90+ score",
    "Scale infrastructure for 50% growth"
  ],
  "confidence": 0.81
}
```

**API**:
```javascript
POST /api/ai/report/yearly
Body: { "year": 2025 }
```

## ðŸ” Plan Restrictions

### Free Plan
- âœ… DSR only
- âœ… 10,000 AI tokens/month
- âœ… 30 reports/month
- âŒ No weekly reports
- âŒ No monthly reports
- âŒ No yearly reports
- âŒ No forecasting

### Pro Plan
- âœ… DSR
- âœ… Weekly reports
- âœ… Monthly reports
- âœ… Forecasting included
- âœ… 100,000 AI tokens/month
- âœ… 200 reports/month
- âŒ No yearly strategic reports

### Enterprise Plan
- âœ… All report types
- âœ… Yearly strategic intelligence
- âœ… Security deep insights
- âœ… AI trend comparison
- âœ… 1,000,000 AI tokens/month
- âœ… Unlimited reports

## ðŸŽ¨ Architecture Highlights

### 1. Central AI Service
All AI calls go through `ai.service.js`:
```javascript
import { executeAI } from "../ai/ai.service.js";

const result = await executeAI({
  tenantId,
  userId,
  type: "report.dsr",
  prompt: "Generate DSR...",
  schema: { /* JSON schema */ },
  metadata: { explainability: { ... } }
});
```

**Benefits**:
- Single point of control
- Automatic token tracking
- Prompt sanitization
- Quota enforcement
- Execution logging

### 2. Async Processing with BullMQ
Heavy reports processed in background:
```javascript
// Controller enqueues job
const jobId = await enqueueReportJob({
  type: "DSR",
  tenantId,
  userId,
  params: { date }
});

// Worker processes job
reportWorker.process(async (job) => {
  const report = await generateDSR(job.data);
  return report;
});
```

**Benefits**:
- Non-blocking API responses
- Retry on failure (3 attempts)
- Rate limiting (10 jobs/min)
- Progress tracking

### 3. Redis Caching
Completed reports cached for fast access:
```javascript
// Cache key: ai:report:{tenantId}:{reportType}:{period}
await cacheReport(tenantId, "DSR", date, reportData);

// Cache hit = instant response
const cached = await getCachedReport(tenantId, "DSR", date);
```

**TTL**:
- DSR: 1 hour
- Weekly: 24 hours
- Monthly: 7 days
- Yearly: 30 days

### 4. Cron Schedulers
Automated report generation:
```javascript
// DSR - Daily at 6 AM
cron.schedule("0 6 * * *", generateDSRForAllTenants);

// Weekly - Monday at 7 AM
cron.schedule("0 7 * * 1", generateWeeklyReports);

// Monthly - 1st at 8 AM
cron.schedule("0 8 1 * *", generateMonthlyReports);

// Yearly - Jan 1st at 9 AM
cron.schedule("0 9 1 1 *", generateYearlyReports);
```

### 5. AI Governance
Every execution tracked:
```javascript
{
  tokensUsed: 1250,
  costEstimate: 0.0025,
  modelVersion: "OpenAI-1.5-flash",
  dataScope: {
    tasksAnalyzed: 145,
    eventsAnalyzed: 320
  },
  confidenceScore: 0.87,
  explainability: {
    reasoning: "Analysis based on task completion patterns...",
    keySignals: ["completion_rate", "overdue_count", "blocked_tasks"],
    dataQuality: "high"
  }
}
```

## ðŸ”§ Customization

### Add New Report Type
1. Create service function in `report.ai.service.js`:
```javascript
export async function generateQuarterlyReport({ tenantId, userId, quarterStart }) {
  // Fetch data
  // Build prompt
  // Execute AI
  // Store report
}
```

2. Add controller in `report.ai.controller.js`:
```javascript
export async function generateQuarterlyReportController(req, res, next) {
  // Validate
  // Check quota
  // Enqueue job
}
```

3. Add route in `report.ai.routes.js`:
```javascript
router.post("/quarterly", generateQuarterlyReportController);
```

4. Add worker handler in `report.worker.js`:
```javascript
case "QUARTERLY":
  result = await generateQuarterlyReport(params);
  break;
```

### Customize AI Prompts
Edit prompts in `report.ai.service.js`:
```javascript
const prompt = `You are an enterprise AI analyst...

**Your custom instructions here**

Generate report with:
1. Custom section 1
2. Custom section 2
...`;
```

### Adjust Caching
Modify TTL in `report.cache.service.js`:
```javascript
const CACHE_TTL = {
  DSR: 7200,      // 2 hours
  WEEKLY: 172800, // 48 hours
  MONTHLY: 1209600, // 14 days
  YEARLY: 5184000  // 60 days
};
```

## ðŸ“ˆ Monitoring

### Key Metrics
```javascript
// Reports generated
db.aireports.countDocuments({ status: "completed" })

// Average processing time
db.aireports.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: null, avgTime: { $avg: "$durationMs" } } }
])

// Token consumption
db.aiusage.aggregate([
  { $group: { _id: "$tenantId", totalTokens: { $sum: "$tokensUsed" } } }
])

// Cache hit rate
redis-cli INFO stats | grep keyspace_hits
```

### Logs
```bash
# Report generation logs
tail -f apps/api/logs/app.log | grep "Report generated"

# Worker logs
tail -f apps/api/logs/app.log | grep "Report worker"

# AI execution logs
tail -f apps/api/logs/app.log | grep "AI execution"
```

## ðŸ› Troubleshooting

### Issue: Reports not generating
**Check**:
1. Workers running? `ps aux | grep worker`
2. Redis connected? `redis-cli ping`
3. MongoDB connected? `mongosh --eval "db.adminCommand('ping')"`
4. Queue depth: Check BullMQ dashboard

### Issue: AI quota exceeded
**Solution**:
```javascript
// Check current usage
const usage = await AIUsage.findOne({ 
  tenantId, 
  monthKey: "202602" 
});

// Increase plan limits
await PlanCatalog.updateOne(
  { planCode: "pro" },
  { $set: { "limits.maxAITokensPerMonth": 200000 } }
);
```

### Issue: Slow report generation
**Optimize**:
1. Reduce data scope (limit queries)
2. Use lean() for MongoDB queries
3. Parallel data fetching with Promise.all()
4. Optimize prompts (shorter = faster)

## ðŸš€ Production Checklist

- [ ] Set `OpenAI_API_KEY` in production env
- [ ] Configure Redis persistence
- [ ] Set up MongoDB replica set
- [ ] Enable worker auto-restart (PM2/systemd)
- [ ] Configure log rotation
- [ ] Set up monitoring (Datadog/New Relic)
- [ ] Enable rate limiting on API
- [ ] Configure backup for MongoDB
- [ ] Set up alerts for queue depth
- [ ] Test failover scenarios
- [ ] Document runbooks
- [ ] Load test report generation
- [ ] Set up CDN for exports (S3 + CloudFront)

## ðŸ“š Next Steps

1. **Test the system**: Generate reports for test tenants
2. **Monitor performance**: Track token usage and processing times
3. **Gather feedback**: Collect user feedback on report quality
4. **Iterate prompts**: Refine AI prompts based on output quality
5. **Scale workers**: Add more workers as load increases
6. **Add visualizations**: Integrate charts in PDF exports
7. **Email delivery**: Implement automated email distribution
8. **Custom templates**: Allow users to customize report formats

## ðŸ’¡ Best Practices

1. **Always use central AIService** - Never call OpenAI directly
2. **Enforce tenant isolation** - Include tenantId in all queries
3. **Check quotas first** - Validate before expensive operations
4. **Cache aggressively** - Reduce redundant AI calls
5. **Log everything** - Track all AI executions for governance
6. **Handle failures gracefully** - Retry with backoff
7. **Optimize prompts** - Shorter prompts = lower costs
8. **Monitor token usage** - Alert on unusual spikes
9. **Test with real data** - Use production-like datasets
10. **Document changes** - Keep AI prompts version controlled

---

**Built with â¤ï¸ for enterprise-grade AI intelligence**
