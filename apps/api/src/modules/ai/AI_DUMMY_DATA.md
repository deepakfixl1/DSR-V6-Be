# AI Dummy Data + Example Questions

This document provides realistic dummy payloads for AI queries and examples of supported questions.  
Use these as templates for `POST /api/ai/assistant/query`.

## 1. Standard Request Body (Full)

```json
{
  "tenantId": "65f1c5a6a9b0c1d2e3f4a5b6",
  "query": "How many tasks are assigned to me and what are the top blockers?",
  "context": {
    "me": {
      "userId": "65f1c5a6a9b0c1d2e3f4a5b7",
      "name": "Vikas Sharma",
      "role": "Manager",
      "teamId": "65f1c5a6a9b0c1d2e3f4a5b8"
    },
    "tasks": [],
    "projects": [],
    "teams": [],
    "reports": []
  }
}
```

## 2. Full Dummy Context (Recommended)

```json
{
  "me": {
    "userId": "65f1c5a6a9b0c1d2e3f4a5b7",
    "name": "Vikas Sharma",
    "role": "Manager",
    "memberId": "65f1c5a6a9b0c1d2e3f4m001",
    "teamId": "65f1c5a6a9b0c1d2e3f4a5b8"
  },
  "tasks": [
    {
      "_id": "65f1c5a6a9b0c1d2e3f4b001",
      "title": "Finalize onboarding flow",
      "description": "Ensure onboarding includes MFA setup",
      "status": "in_progress",
      "priority": "high",
      "assigneeId": "65f1c5a6a9b0c1d2e3f4m001",
      "departmentId": "65f1c5a6a9b0c1d2e3f4c001",
      "projectId": "65f1c5a6a9b0c1d2e3f4d001",
      "dueAt": "2026-03-01T00:00:00.000Z",
      "completedAt": null,
      "metadata": { "blocked": false, "riskLevel": "medium", "vip": true }
    },
    {
      "_id": "65f1c5a6a9b0c1d2e3f4b002",
      "title": "Fix report export bug",
      "description": "CSV export fails for large reports",
      "status": "open",
      "priority": "critical",
      "assigneeId": "65f1c5a6a9b0c1d2e3f4m002",
      "departmentId": "65f1c5a6a9b0c1d2e3f4c001",
      "projectId": "65f1c5a6a9b0c1d2e3f4d002",
      "dueAt": "2026-02-28T00:00:00.000Z",
      "completedAt": null,
      "metadata": { "blocked": true, "riskLevel": "high", "vip": false }
    },
    {
      "_id": "65f1c5a6a9b0c1d2e3f4b003",
      "title": "Clean up audit logs",
      "description": "Optimize audit log query performance",
      "status": "done",
      "priority": "medium",
      "assigneeId": "65f1c5a6a9b0c1d2e3f4m001",
      "departmentId": "65f1c5a6a9b0c1d2e3f4c002",
      "projectId": null,
      "dueAt": "2026-02-20T00:00:00.000Z",
      "completedAt": "2026-02-21T12:00:00.000Z",
      "metadata": { "blocked": false, "riskLevel": "low", "vip": false }
    }
  ],
  "projects": [
    {
      "_id": "65f1c5a6a9b0c1d2e3f4d001",
      "name": "Enterprise AI Layer",
      "status": "active",
      "ownerId": "65f1c5a6a9b0c1d2e3f4a5b7",
      "riskLevel": "medium",
      "targetDate": "2026-03-31T00:00:00.000Z",
      "metadata": { "budget": 12000, "priority": "high" }
    }
  ],
  "teams": [
    {
      "_id": "65f1c5a6a9b0c1d2e3f4a5b8",
      "name": "Platform",
      "members": [
        { "userId": "65f1c5a6a9b0c1d2e3f4a5b7", "name": "Vikas Sharma" },
        { "userId": "65f1c5a6a9b0c1d2e3f4a5b9", "name": "Aditi Rao" }
      ]
    }
  ],
  "reports": [
    {
      "_id": "65f1c5a6a9b0c1d2e3f4r001",
      "type": "DSR",
      "periodStart": "2026-02-24T00:00:00.000Z",
      "summary": "2 tasks completed, 1 blocked"
    }
  ]
}
```

## 3. Example Questions + Expected Data Use

Use any of these in `query`.

1. "How many tasks are assigned to me?"
2. "Which tasks are overdue for my team?"
3. "List critical tasks due this week."
4. "Summarize blockers across all projects."
5. "Which tasks are stuck in open status for more than 7 days?"
6. "What is my current workload vs team average?"
7. "Which projects are at risk of missing deadline?"
8. "What should I focus on today?"
9. "How many tasks are in progress by department?"
10. "Show completed tasks for the last 7 days."
11. "Identify high-priority tasks with no assignee."
12. "Give me a quick summary of this week's progress."

## 4. Minimum Context Examples

### Only Tasks
```json
{
  "tasks": [
    {
      "_id": "65f1c5a6a9b0c1d2e3f4b010",
      "title": "Update rate limiter",
      "status": "open",
      "priority": "high",
      "assigneeId": "65f1c5a6a9b0c1d2e3f4a5b7",
      "departmentId": "65f1c5a6a9b0c1d2e3f4c001",
      "dueAt": "2026-02-28T00:00:00.000Z",
      "metadata": { "blocked": false }
    }
  ]
}
```

### Tasks + Me
```json
{
  "me": { "userId": "65f1c5a6a9b0c1d2e3f4a5b7", "name": "Vikas Sharma" },
  "tasks": []
}
```

Note: `assigneeId` in tasks references `TenantMembership._id`, not `User._id`.

## 5. Sample Response (AI Contract)

```json
{
  "status": "ok",
  "data": {
    "assignedToMe": 2,
    "blocked": 1,
    "topRisks": ["Fix report export bug is blocked and critical"]
  },
  "explanation": "Counted tasks with assigneeId matching current user",
  "reasoning": "Derived metrics from task list and metadata",
  "tokensUsed": 410,
  "modelVersion": "gpt-4o-mini-2024-07-18"
}
```
