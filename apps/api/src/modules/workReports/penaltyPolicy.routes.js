/**
 * Penalty Policy & Log routes.
 * Admin/Owner manages policies and logs.
 */

import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { z } from "zod";
import * as service from "./penalty.service.js";

const reminderSchema = z.object({
  minutesBefore: z.number().int().min(1).max(10080),
  channels: z.array(z.enum(["IN_APP", "EMAIL"])).default(["IN_APP", "EMAIL"])
});

const createPolicySchema = {
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]),
    reminders: z.array(reminderSchema).default([]),
    penaltyType: z.enum(["none", "warning", "salary_deduction", "custom"]).default("warning"),
    deductionFraction: z.number().min(0).max(1).default(0.25),
    customPenaltyDescription: z.string().max(500).optional(),
    gracePeriodMinutes: z.number().int().min(0).max(1440).default(0),
    autoApplyPenalty: z.boolean().default(false),
    allowLateSubmissionRequest: z.boolean().default(true),
    requireManagerApproval: z.boolean().default(true),
    status: z.enum(["active", "paused"]).default("active")
  })
};

const updatePolicySchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    reminders: z.array(reminderSchema).optional(),
    penaltyType: z.enum(["none", "warning", "salary_deduction", "custom"]).optional(),
    deductionFraction: z.number().min(0).max(1).optional(),
    customPenaltyDescription: z.string().max(500).optional(),
    gracePeriodMinutes: z.number().int().min(0).max(1440).optional(),
    autoApplyPenalty: z.boolean().optional(),
    allowLateSubmissionRequest: z.boolean().optional(),
    requireManagerApproval: z.boolean().optional(),
    status: z.enum(["active", "paused"]).optional()
  })
};

const idSchema = { params: z.object({ id: z.string().min(1) }) };

const listLogsSchema = {
  query: z.object({
    employeeId: z.string().optional(),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]).optional(),
    status: z.enum(["pending", "applied", "waived"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
};

const waiveSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    waiveReason: z.string().max(1000).optional()
  })
};

const applyManualSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    workReportId: z.string().optional(),
    policyId: z.string().optional(),
    reportType: z.enum(["DSR", "WSR", "MSR", "QSR", "YSR"]),
    penaltyType: z.enum(["warning", "salary_deduction", "custom"]),
    deductionFraction: z.number().min(0).max(1).optional(),
    description: z.string().max(1000).optional(),
    missedDeadline: z.string().datetime(),
    period: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      label: z.string().optional()
    }).optional()
  })
};

export const createPenaltyPolicyRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  // ── Policies ───────────────────────────────────────────────────────
  router.get("/", validate({ query: z.object({ reportType: z.enum(["DSR","WSR","MSR","QSR","YSR"]).optional(), status: z.enum(["active","paused"]).optional() }) }), async (req, res, next) => {
    try {
      const docs = await service.listPenaltyPolicies({
        tenantId: req.tenant._id,
        reportType: req.query.reportType,
        status: req.query.status
      });
      res.json({ success: true, data: docs });
    } catch (err) { next(err); }
  });

  router.get("/:id", validate(idSchema), async (req, res, next) => {
    try {
      const doc = await service.getPenaltyPolicy({ tenantId: req.tenant._id, policyId: req.params.id });
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  router.post("/", validate(createPolicySchema), async (req, res, next) => {
    try {
      const doc = await service.createPenaltyPolicy({
        tenantId: req.tenant._id,
        createdByUserId: req.user._id,
        data: req.body
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  router.patch("/:id", validate(updatePolicySchema), async (req, res, next) => {
    try {
      const doc = await service.updatePenaltyPolicy({
        tenantId: req.tenant._id,
        policyId: req.params.id,
        data: req.body
      });
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  router.delete("/:id", validate(idSchema), async (req, res, next) => {
    try {
      await service.deletePenaltyPolicy({ tenantId: req.tenant._id, policyId: req.params.id });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
};

export const createPenaltyLogRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  // ── Penalty Logs ───────────────────────────────────────────────────
  router.get("/", validate(listLogsSchema), async (req, res, next) => {
    try {
      const { employeeId, reportType, status, page, limit } = req.query;
      const result = await service.listPenaltyLogs({
        tenantId: req.tenant._id,
        employeeId,
        reportType,
        status,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  });

  router.get("/:id", validate(idSchema), async (req, res, next) => {
    try {
      const doc = await service.getPenaltyLog({ tenantId: req.tenant._id, logId: req.params.id });
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  router.post("/", validate(applyManualSchema), async (req, res, next) => {
    try {
      const doc = await service.applyPenaltyManually({
        tenantId: req.tenant._id,
        appliedByUserId: req.user._id,
        ...req.body
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  router.patch("/:id/waive", validate(waiveSchema), async (req, res, next) => {
    try {
      const doc = await service.waivePenalty({
        tenantId: req.tenant._id,
        logId: req.params.id,
        waivedByUserId: req.user._id,
        waiveReason: req.body.waiveReason
      });
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  });

  return router;
};
