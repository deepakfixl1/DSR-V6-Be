import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const dateString = z.coerce.date();

export const createWeekCycleSchema = {
  body: z.object({
    employeeMemberId: objectId,
    weekStartDate: dateString,
    weekEndDate: dateString,
    workingDays: z.array(z.number().int().min(1).max(7)).optional(),
    goalSlotCount: z.number().int().min(1).max(7).optional(),
    carriedForwardGoalCount: z.number().int().min(0).optional(),
    employeeRemarks: z.string().max(5000).nullable().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

export const updateWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    workingDays: z.array(z.number().int().min(1).max(7)).optional(),
    goalSlotCount: z.number().int().min(1).max(7).optional(),
    carriedForwardGoalCount: z.number().int().min(0).optional(),
    employeeRemarks: z.string().max(5000).nullable().optional(),
    managerRemarks: z.string().max(5000).nullable().optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

export const getWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
};

export const listWeekCyclesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    employeeMemberId: objectId.optional(),
    status: z.enum(["OPEN", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "LOCKED"]).optional(),
    approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  }),
};

export const deleteWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
};

export const submitWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    employeeRemarks: z.string().max(5000).nullable().optional(),
  }).optional(),
};

export const reviewWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    managerRemarks: z.string().max(5000).nullable().optional(),
  }).optional(),
};

export const approveWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    managerRemarks: z.string().max(5000).nullable().optional(),
  }).optional(),
};

export const rejectWeekCycleSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    managerRemarks: z.string().trim().min(1).max(5000),
  }),
};