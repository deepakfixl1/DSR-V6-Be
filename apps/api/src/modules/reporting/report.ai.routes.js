/**
 * Report AI Routes
 */

import express from "express";
import { ApiError } from "#api/utils/ApiError.js";
import {
  getLatestDSRController,
  getReportStatusController,
  getReportHistoryController,
  getReportController,
  exportReportController
} from "./report.ai.controller.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { reportValidation } from "./report.validation.js";
import { aiGuard } from "#api/modules/ai/ai.guard.js";
import { AI_FEATURES } from "#api/modules/ai/ai.model.js";

const router = express.Router();

const rejectAutoReportGeneration = (_req, _res, next) => {
  return next(
    new ApiError(
      410,
      "AI auto report generation has been deprecated. Reports must be written manually and AI can only provide suggestions/analysis."
    )
  );
};

// All routes require authentication
router.use(authenticate());
// router.use(aiGuard({ feature: AI_FEATURES.report, permission: "ai.report" }));

// DSR routes
router.post("/dsr", rejectAutoReportGeneration);
router.get("/dsr/latest", getLatestDSRController);

// Weekly report
router.post("/weekly", validate(reportValidation.generateWeekly), rejectAutoReportGeneration);

// Monthly report
router.post("/monthly", validate(reportValidation.generateMonthly), rejectAutoReportGeneration);

// Quarterly report
router.post("/quarterly", validate(reportValidation.generateQuarterly), rejectAutoReportGeneration);

// Yearly report (Enterprise only)
router.post("/yearly", validate(reportValidation.generateYearly), rejectAutoReportGeneration);

// Report status and history
router.get("/status/:jobId", getReportStatusController);
router.get("/history", getReportHistoryController);
router.get("/:reportId", getReportController);

// Export
router.post("/export/:reportId", validate(reportValidation.exportReport), exportReportController);

export default router;
