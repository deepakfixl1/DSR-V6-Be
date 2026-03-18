# Missing Routes — Backend Suggestions

> ⚠️  DO NOT MODIFY EXISTING BACKEND FILES.
> All suggestions below are new additions to implement.
> Follow the existing architecture (Router → Controller → Service → Validation).

---

## 1. Dashboard Stats Endpoint

**Missing Route:**
```
GET /api/dashboard/stats
```

**Purpose:**
Employee or manager needs a single endpoint returning today's goals count, pending reports, unread notifications, and blocker count. Currently requires 4+ separate API calls on page load.

**Suggested Implementation:**
```js
// File: apps/api/src/modules/dashboard/dashboard.controller.js
export const getDashboardStats = async (req, res) => {
  const { tenantId, user } = req;
  const [pendingGoals, pendingReports, unreadNotifications, openBlockers] = await Promise.all([
    WorkGoal.countDocuments({ tenantId, assigneeId: user._id, status: 'pending' }),
    WorkReport.countDocuments({ tenantId, submittedBy: user._id, status: 'draft' }),
    Notification.countDocuments({ userId: user._id, isRead: false }),
    Blocker.countDocuments({ tenantId, status: { $in: ['open', 'escalated'] } })
  ]);
  res.json({ data: { pendingGoals, pendingReports, unreadNotifications, openBlockers } });
};
```

**Validation Schema:**
```js
export const dashboardStatsSchema = z.object({ query: z.object({}).optional() });
```

**Example Response:**
```json
{
  "data": {
    "pendingGoals": 3,
    "pendingReports": 1,
    "unreadNotifications": 5,
    "openBlockers": 2
  }
}
```

---

## 2. Notification Mark All As Read

**Missing Route:**
```
PATCH /notifications/read-all
```

**Purpose:**
Users need to bulk-clear their notification inbox. Currently only per-notification mark-as-read exists.

**Suggested Implementation:**
```js
// Add to: apps/api/src/modules/notification/notification.controller.js
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.json({ message: 'All notifications marked as read' });
};
```

**Route Addition:**
```js
// Add to: apps/api/src/modules/notification/notification.routes.js
router.patch('/read-all', notificationController.markAllAsRead);
```

---

## 3. MSR (Monthly Status Report) Dedicated Endpoint

**Missing Routes:**
```
GET /api/work-reports/template/msr
POST /api/work-reports/?reportType=msr
```

**Purpose:**
The `/api/work-reports/template/:reportType` route already handles this — but there is no validation that `reportType` accepts `msr`. Confirm it is in the allowed enum in `workReport.validation.js`.

**Check in:** `apps/api/src/modules/workReports/workReport.validation.js`
Ensure `reportType` enum includes: `['dsr', 'wsr', 'msr', 'quarterly', 'yearly']`

---

## 4. Bulk Report Approval

**Missing Route:**
```
POST /api/work-reports/bulk-approve
```

**Purpose:**
Managers reviewing many reports need to approve multiple at once instead of clicking approve on each individually.

**Suggested Implementation:**
```js
// Add to: apps/api/src/modules/workReports/workReport.controller.js
export const bulkApproveWorkReports = async (req, res) => {
  const { reportIds, comment } = req.body;
  const results = await WorkReport.updateMany(
    { _id: { $in: reportIds }, tenantId: req.tenantId, status: 'submitted' },
    { $set: { status: 'approved', approvedBy: req.user._id, approvalComment: comment, approvedAt: new Date() } }
  );
  res.json({ data: { modified: results.modifiedCount } });
};
```

**Validation Schema:**
```js
export const bulkApproveSchema = z.object({
  body: z.object({
    reportIds: z.array(z.string()).min(1).max(50),
    comment: z.string().optional()
  })
});
```

---

## 5. Employee Report History (Self)

**Missing Route:**
```
GET /api/work-reports/my
```

**Purpose:**
Currently `GET /api/work-reports/` returns ALL reports for managers. Employees need a clean self-filtered view without knowing to add query params.

**Suggested Implementation:**
```js
// Add to workReport.routes.js
router.get('/my', requirePermission('work_report.submit'), controller.getMyReports);

// Controller
export const getMyReports = async (req, res) => {
  const reports = await WorkReport.find({
    tenantId: req.tenantId,
    submittedBy: req.user._id
  }).sort({ createdAt: -1 }).limit(50);
  res.json({ data: reports });
};
```

---

## 6. Template Preview

**Missing Route:**
```
GET /api/templates/:id/preview
```

**Purpose:**
Before assigning a template to a department, admins need to preview the rendered form fields. Returns the template structure formatted for preview.

**Suggested Implementation:**
```js
// Add to: apps/api/src/modules/templates/template.controller.js
export const previewTemplate = async (req, res) => {
  const template = await Template.findById(req.params.id);
  if (!template) throw ApiError.notFound('Template not found');
  res.json({ data: { fields: template.fields, name: template.name, reportType: template.reportType } });
};
```

---

## 7. Department Analytics

**Missing Route:**
```
GET /tenants/:tenantId/departments/:departmentId/analytics
```

**Purpose:**
Admin/manager needs department-level goal completion rate, report submission rate, and blocker count for the selected period.

**Suggested Implementation:**
```js
export const getDepartmentAnalytics = async (req, res) => {
  const { tenantId, params: { departmentId }, query: { from, to } } = req;
  const [goals, reports, blockers] = await Promise.all([
    WorkGoal.aggregate([
      { $match: { tenantId: new ObjectId(tenantId), departmentId: new ObjectId(departmentId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    WorkReport.countDocuments({ tenantId, departmentId, createdAt: { $gte: new Date(from), $lte: new Date(to) } }),
    Blocker.countDocuments({ tenantId, departmentId, status: 'open' })
  ]);
  res.json({ data: { goals, reports, openBlockers: blockers } });
};
```

---

## 8. Goal Carry-Forward Without Week Cycle

**Missing Route:**
```
POST /api/goals/carry-forward
```

**Purpose:**
Currently carry-forward is tied to week cycles (`POST /api/week-cycles/:id/carry-forward`). A simpler endpoint to carry specific goals from previous week to current week is needed for the manager UI.

**Suggested Implementation:**
```js
export const carryForwardGoals = async (req, res) => {
  const { goalIds, targetWeekStart } = req.body;
  const newGoals = await Promise.all(
    goalIds.map(async (id) => {
      const original = await WorkGoal.findById(id);
      return WorkGoal.create({ ...original.toObject(), _id: undefined, weekStart: targetWeekStart, status: 'pending', carriedForwardFrom: id });
    })
  );
  res.json({ data: newGoals });
};
```

---

## 9. User Search (for Goal Assignment)

**Missing Route:**
```
GET /tenants/:tenantId/members/search?q=
```

**Purpose:**
When assigning goals, managers need to search members by name/email. The existing `GET /tenants/:tenantId/members` returns all members but doesn't support search.

**Suggested Implementation:**
```js
// Add to membership.routes.js
router.get('/members/search', validate(searchMembersSchema), membershipController.searchMembers);
```

---

## 10. Quarterly & Yearly Report Submit

**Missing Routes:**
```
POST /api/work-reports/ with reportType=quarterly
POST /api/work-reports/ with reportType=yearly
GET  /api/work-reports/template/quarterly
GET  /api/work-reports/template/yearly
```

**Purpose:**
The AI analysis for quarterly and yearly exists but there are no dedicated template or submission endpoints for these report types. Confirm `workReport.validation.js` includes these in the reportType enum.

---

## IMPLEMENTATION CHECKLIST

- [ ] `GET /api/dashboard/stats` — New module: dashboard
- [ ] `PATCH /notifications/read-all` — Add to notification module
- [ ] `POST /api/work-reports/bulk-approve` — Add to workReport module
- [ ] `GET /api/work-reports/my` — Add to workReport module
- [ ] `GET /api/templates/:id/preview` — Add to template module
- [ ] `GET /tenants/:tenantId/departments/:departmentId/analytics` — New controller
- [ ] `POST /api/goals/carry-forward` — Add to workGoal module
- [ ] `GET /tenants/:tenantId/members/search` — Add to membership module
- [ ] Confirm MSR/quarterly/yearly in workReport.validation.js reportType enum
