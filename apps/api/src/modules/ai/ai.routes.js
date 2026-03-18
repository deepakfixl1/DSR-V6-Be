import express from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { validate } from "#api/middlewares/validate.middleware.js";
import { aiGuard } from "./ai.guard.js";
import { AI_FEATURES } from "./ai.model.js";
import {
  assistantQueryController,
  auditSearchController,
  dsrSuggestionController,
  goalProgressAnalysisController,
  goalRecommendationsController,
  goalSuggestController,
  getReportAnalysisController,
  msrAnalysisController,
  pendingGoalsController,
  quarterlyAnalysisController,
  wsrAnalysisController,
  yearlyAnalysisController,
  templateAssistantController,
} from "./ai.controller.js";
import * as validation from "./ai.validation.js";
import { analyzeWorkReport } from "./aireportcontroller.js";

const router = express.Router();

router.use(authenticate());

router.post(
  "/assistant/query",
  resolveTenant(),
  assistantQueryController
);

router.post(
  "/template-assistant",
  resolveTenant(),
  templateAssistantController
);

router.post(
  "/audit/search",
  // aiGuard({ feature: AI_FEATURES.auditSearch, permission: "audit.read" }),
  auditSearchController
);

router.get(
  "/dsr/suggestions",
  resolveTenant(),
  validate(validation.dsrSuggestionSchema),
  dsrSuggestionController
);

router.get(
  "/goals/pending",
  validate(validation.goalsPendingSchema),
  pendingGoalsController
);

router.get(
  "/goals/recommendations/:tenantId",
  validate(validation.goalsRecommendationSchema),
  goalRecommendationsController
);

router.post(
  "/goals/suggest",
  resolveTenant(),
  goalSuggestController
);

// nlayze all types of reports
router.post(
  "/report/analyze/:tenantId",
  validate(validation.analyzeReportSchema),
 analyzeWorkReport
);

router.get(
  "/report/:reportId/analysis",
  validate(validation.reportAnalysisSchema),
  getReportAnalysisController
);

router.get(
  "/goals/:goalId/progress-analysis",
  validate(validation.goalProgressAnalysisSchema),
  goalProgressAnalysisController
);

router.get(
  "/wsr/analysis",
  validate(validation.periodAnalysisSchema),
  wsrAnalysisController
);

router.get(
  "/msr/analysis",
  validate(validation.periodAnalysisSchema),
  msrAnalysisController
);

router.get(
  "/quarterly/analysis",
  validate(validation.periodAnalysisSchema),
  quarterlyAnalysisController
);

router.get(
  "/yearly/analysis",
  validate(validation.periodAnalysisSchema),
  yearlyAnalysisController
);

export default router;
