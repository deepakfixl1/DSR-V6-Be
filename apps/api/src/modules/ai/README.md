# AI Module

Enterprise AI layer for multi-tenant SaaS. All AI calls must go through `ai.service.js`.

## Environment

- `OPENAI_API_KEY` is required at startup. The API server exits if OpenAI health check fails.

## Core Rules

- Tenant-scoped only.
- No external knowledge or unrelated queries.
- Always return JSON with `status`, `data`, `explanation`, `reasoning`.
- PII redaction applied.
- Input hashing + caching to prevent regeneration.

## Key Files

- `ai.openai.js` OpenAI client wrapper (health check, retries, timeout, circuit breaker).
- `ai.rules.js` Rule enforcement and prompt template.
- `ai.service.js` Central executor with caching, logging, token tracking.
- `ai.guard.js` Plan gating, permission checks, rate/token limits.
- `ai.memory.js` Redis short-term memory utilities.
- `ai.queue.js` BullMQ queues and workers.
- `ai.recommendation.js` Task recommendation engine.
- `ai.risk.js` Risk analysis engine.
- `ai.forecast.js` Forecasting engine.
- `ai.security.js` Security/anomaly detection.
- `ai.summary.js` Summary generator.

## Endpoints

### AI Assistant
`POST /api/ai/assistant/query`

Body:
```json
{
  "tenantId": "<tenant-id>",
  "query": "Summarize my team's blockers",
  "context": { "tasks": [], "projects": [] }
}
```

### Audit Search NLP
`POST /api/ai/audit/search`

Body:
```json
{
  "tenantId": "<tenant-id>",
  "query": "Who changed billing last week?"
}
```

## AI Reports

Use `POST /api/ai/report/*` endpoints for DSR/Weekly/Monthly/Quarterly/Yearly reports. Results are cached and stored in `AIInsight` and `AIReport` with `aiInsightId`.

## Response Format

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

## Queues

- `ai-report-generation`
- `ai-risk-analysis`
- `ai-summary`
- `ai-forecast`
- `ai-security-monitor`

## Storage

- `AIExecutionLog` for audit trails and caching.
- `AIInsight` for long-term insights.
- `AIRecommendation` for task and workload suggestions.
- `AIUsage` for token tracking per tenant/month.
