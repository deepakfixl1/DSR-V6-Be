import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const nullableObjectId = objectId.nullable().optional();

const dateString = z.coerce.date();

const blockerSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  isResolved: z.boolean().optional(),
  resolvedAt: dateString.nullable().optional(),
});

const timelineSchema = z.object({
  startDate: dateString,
  dueDate: dateString,
  dueDayOfWeek: z.number().int().min(1).max(7),
});

const progressSchema = z.object({
  selfReportedPct: z.number().min(0).max(100).optional(),
  managerApprovedPct: z.number().min(0).max(100).optional(),
}).optional();

const approvalSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"]).optional(),
  rejectionReason: z.string().max(5000).nullable().optional(),
}).optional();

const reportingSchema = z.object({
  includeInDSR: z.boolean().optional(),
  includeInWSR: z.boolean().optional(),
  includeInMSR: z.boolean().optional(),
}).optional();

export const createWorkGoalSchema = {
  body: z.object({
    departmentId: objectId,
    weekCycleId: objectId,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).nullable().optional(),
    goalType: z.enum(["parent", "child", "direct"]).optional(),
    category: z.enum([
      "DELIVERY",
      "SALES",
      "SUPPORT",
      "LEARNING",
      "OPERATIONS",
      "QUALITY",
      "CUSTOM",
      "DEVELOPMENT",
    ]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    assignedToMemberId: objectId,
    assignedBy: objectId.optional(),
    parentGoalId: nullableObjectId,
    dependsOnGoalIds: z.array(objectId).optional(),
    status: z.enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "BLOCKED",
      "UNDER_REVIEW",
      "COMPLETED",
      "CARRIED_FORWARD",
    ]).optional(),
    progress: progressSchema,
    timeline: timelineSchema,
    targetDate: dateString.nullable().optional(),
    weight: z.number().min(0).optional(),
    estimatedHours: z.number().min(0).optional(),
    actualHours: z.number().min(0).optional(),
    blockers: z.array(blockerSchema).optional(),
    remarks: z.string().max(5000).nullable().optional(),
    managerRemarks: z.string().max(5000).nullable().optional(),
    visibility: z.enum(["PRIVATE", "TEAM", "DEPARTMENT", "MANAGEMENT"]).optional(),
    approval: approvalSchema,
    originGoalId: nullableObjectId,
    isCarriedForward: z.boolean().optional(),
    reporting: reportingSchema,
    tags: z.array(z.string().trim().min(1)).optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

export const updateWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
  body: createWorkGoalSchema.body.partial(),
};

export const getWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
};

export const listWorkGoalsSchema = {
  query: z.object({
    tenantId: objectId.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    weekCycleId: objectId.optional(),
    departmentId: objectId.optional(),
    assignedToMemberId: objectId.optional(),
    status: z.enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "BLOCKED",
      "UNDER_REVIEW",
      "COMPLETED",
      "CARRIED_FORWARD",
    ]).optional(),
    approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"]).optional(),
    goalType: z.enum(["parent", "child", "direct"]).optional(),
    category: z.enum([
      "DELIVERY",
      "SALES",
      "SUPPORT",
      "LEARNING",
      "OPERATIONS",
      "QUALITY",
      "CUSTOM",
      "DEVELOPMENT",
    ]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    search: z.string().optional(),
    visibility: z.enum(["PRIVATE", "TEAM", "DEPARTMENT", "MANAGEMENT"]).optional(),
  }),
};

export const deleteWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
};

export const approveWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    managerApprovedPct: z.number().min(0).max(100).optional(),
    managerRemarks: z.string().max(5000).nullable().optional(),
  }),
};

export const rejectWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    rejectionReason: z.string().trim().min(1).max(5000),
    managerRemarks: z.string().max(5000).nullable().optional(),
  }),
};

export const submitWorkGoalSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    selfReportedPct: z.number().min(0).max(100).optional(),
    remarks: z.string().max(5000).nullable().optional(),
    blockers: z.array(blockerSchema).optional(),
    status: z.enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "BLOCKED",
      "UNDER_REVIEW",
      "COMPLETED",
      "CARRIED_FORWARD",
    ]).optional(),
  }).optional(),
};

export const carryForwardGoalsSchema = {
  body: z.object({
    goalIds: z.array(objectId).min(1),
    targetWeekCycleId: objectId,
  }).strict(),
};

export const goalsByDepartmentSchema = {
  params: z.object({
    deptId: objectId,
  }),
  query: listWorkGoalsSchema.query,
};

export const goalHistorySchema = {
  params: z.object({
    id: objectId,
  }),
};

export const updateWorkGoalStatusSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    status: z.enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "BLOCKED",
      "UNDER_REVIEW",
      "COMPLETED",
      "CARRIED_FORWARD",
    ]),
    reason: z.string().max(5000).nullable().optional(),
    comment: z.string().max(5000).nullable().optional(),
  }).strict(),
};
