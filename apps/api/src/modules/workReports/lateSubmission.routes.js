/**
 * Late Submission Request routes.
 * - Employees: POST /work-reports/:id/request-extension
 * - Managers/Admins: GET/PATCH /late-submission-requests
 */

import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { z } from "zod";
import { validate } from "#api/middlewares/validate.middleware.js";
import * as service from "./lateSubmission.service.js";
import { ApiError } from "#api/utils/ApiError.js";

const requestExtensionSchema = {
  body: z.object({
    reason: z.string().min(1).max(2000)
  }),
  params: z.object({
    id: z.string().min(1)
  })
};

const listLSRSchema = {
  query: z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
};

const lsrIdSchema = {
  params: z.object({ id: z.string().min(1) })
};

const approveSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    extendedDeadline: z.string().datetime().optional(),
    managerNotes: z.string().max(1000).optional()
  })
};

const rejectSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    managerNotes: z.string().max(1000).optional()
  })
};

// ── Work-report scoped (request extension) ─────────────────────────────────

export const createLateSubmissionWorkReportRoutes = () => {
  const router = Router({ mergeParams: true });

  router.use(authenticate());
  router.use(resolveTenant());

  // POST /work-reports/:id/request-extension
  router.post(
    "/request-extension",
    validate(requestExtensionSchema),
    async (req, res, next) => {
      try {
        const lsr = await service.requestLateSubmission({
          tenantId: req.tenant._id,
          workReportId: req.params.id,
          requestedByUserId: req.user._id,
          requestedByMemberId: req.member?._id || req.membership?._id,
          reason: req.body.reason
        });
        res.status(201).json({ success: true, data: lsr });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};

// ── Top-level LSR management ────────────────────────────────────────────────

export const createLateSubmissionRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  // GET /late-submission-requests
  router.get(
    "/",
    validate(listLSRSchema),
    async (req, res, next) => {
      try {
        const { status, page, limit } = req.query;
        // Managers see only their own requests unless user is admin/owner
        const isAdminOrOwner = req.membership?.isOwner || req.rbac?.hasAnyRole?.("tenant_admin", "owner");
        const managerId = isAdminOrOwner ? null : req.user._id;

        const result = await service.listLateSubmissionRequests({
          tenantId: req.tenant._id,
          managerId,
          status,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20
        });
        res.json({ success: true, ...result });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /late-submission-requests/:id
  router.get(
    "/:id",
    validate(lsrIdSchema),
    async (req, res, next) => {
      try {
        const lsr = await service.getLateSubmissionRequest({
          tenantId: req.tenant._id,
          lsrId: req.params.id
        });
        res.json({ success: true, data: lsr });
      } catch (err) {
        next(err);
      }
    }
  );

  // PATCH /late-submission-requests/:id/approve
  router.patch(
    "/:id/approve",
    validate(approveSchema),
    async (req, res, next) => {
      try {
        const lsr = await service.approveLateSubmission({
          tenantId: req.tenant._id,
          lsrId: req.params.id,
          respondedByUserId: req.user._id,
          extendedDeadline: req.body.extendedDeadline,
          managerNotes: req.body.managerNotes
        });
        res.json({ success: true, data: lsr });
      } catch (err) {
        next(err);
      }
    }
  );

  // PATCH /late-submission-requests/:id/reject
  router.patch(
    "/:id/reject",
    validate(rejectSchema),
    async (req, res, next) => {
      try {
        const lsr = await service.rejectLateSubmission({
          tenantId: req.tenant._id,
          lsrId: req.params.id,
          respondedByUserId: req.user._id,
          managerNotes: req.body.managerNotes
        });
        res.json({ success: true, data: lsr });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};
