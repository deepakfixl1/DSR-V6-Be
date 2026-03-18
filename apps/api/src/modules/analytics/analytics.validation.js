import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const employeeScorecardSchema = z.object({ params: z.object({ memberId: objectId }), query: z.object({ tenantId: objectId }) });
export const teamAnalyticsSchema = z.object({ params: z.object({ managerId: objectId }), query: z.object({ tenantId: objectId }) });
export const departmentAnalyticsSchema = z.object({ params: z.object({ deptId: objectId }), query: z.object({ tenantId: objectId }) });
export const reportScoringSchema = z.object({ params: z.object({ id: objectId }), query: z.object({ tenantId: objectId }) });
export const employeeScoringSchema = z.object({ params: z.object({ memberId: objectId }), query: z.object({ tenantId: objectId }) });
export const trendsSchema = z.object({ query: z.object({ tenantId: objectId }) });
