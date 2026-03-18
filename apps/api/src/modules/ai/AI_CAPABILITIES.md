# AI Capabilities

This document lists the AI features, routes, request bodies, and response shapes.

## Response Contract (All AI)

```json
{
  "status": "ok|cached|insufficient_data|refused|error",
  "data": {},
  "explanation": "Why this response was generated",
  "reasoning": "Internal reasoning summary",
  "tokensUsed": 0,
  "modelVersion": "gpt-4o-mini-2024-07-18"
}
```

## AI Assistant

Endpoint: `POST /api/ai/assistant/query`

Request:
```json
{
  "tenantId": "<tenant-id>",
  "query": "Summarize blockers for my team",
  "context": {
    "tasks": [],
    "projects": []
  }
}
```

Response: standard AI response contract.

## Audit Search NLP

Endpoint: `POST /api/ai/audit/search`

Request:
```json
{
  "tenantId": "<tenant-id>",
  "query": "Who changed billing last week?"
}
```

Response:
```json
{
  "status": "ok",
  "data": {
    "filter": {
      "resourceType": "billing",
      "action": { "$regex": "update", "$options": "i" },
      "createdAt": { "$gte": "2026-02-18T00:00:00.000Z", "$lte": "2026-02-25T00:00:00.000Z" }
    },
    "parsed": { "resourceType": "billing", "action": "update", "window": { "start": "...", "end": "..." } }
  },
  "explanation": "Parsed audit search intent into MongoDB filters",
  "reasoning": "Rule-based NLP extraction",
  "tokensUsed": 0,
  "modelVersion": "rules-v1"
}
```

## AI Reports

All report endpoints require auth + AI guard.

### DSR
`POST /api/ai/report/dsr`
```json
{ "tenantId": "<tenant-id>", "date": "2026-02-24" }
```

### Weekly
`POST /api/ai/report/weekly`
```json
{ "tenantId": "<tenant-id>", "weekStart": "2026-02-17" }
```

### Monthly
`POST /api/ai/report/monthly`
```json
{ "tenantId": "<tenant-id>", "monthStart": "2026-02-01" }
```

### Quarterly
`POST /api/ai/report/quarterly`
```json
{ "tenantId": "<tenant-id>", "quarterStart": "2026-01-01" }
```

### Yearly (Enterprise)
`POST /api/ai/report/yearly`
```json
{ "tenantId": "<tenant-id>", "year": 2026 }
```

Report responses are stored in `AIReport` and linked via `AIInsight`.

## AI Engines (Background Jobs)

Queues (BullMQ):
1. `ai-report-generation`
2. `ai-risk-analysis`
3. `ai-summary`
4. `ai-forecast`
5. `ai-security-monitor`

### Risk Analysis
- Project risk (deadlines, high priority)
- Burnout risk (time logs)

### Forecast
- Completion forecast (from AI reports)
- Capacity forecast (from time logs)
- Revenue forecast (insufficient data placeholder)

### Security
- Login/permission/export spikes
- Dashboard anomaly detection (baseline vs recent)

### Recommendations
- Task focus recommendations
- Team workload rebalance

## Governance

- Prompt + response logging in `AIExecutionLog`
- Token usage in `AIUsage`
- Long-term insights in `AIInsight`
- Plan gating + rate limits in `ai.guard.js`

