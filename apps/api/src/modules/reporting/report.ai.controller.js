/**
 * Report AI Controller. Handles HTTP requests for AI-powered reports.
 */

import { ApiError } from "#api/utils/ApiError.js";

const deprecated = () => {
  throw new ApiError(
    410,
    "AI report generation has been removed. Use manual work reports with AI suggestions/analysis instead."
  );
};

/**
 * POST /api/ai/report/dsr
 * Generate Daily Status Report
 */
export async function generateDSRController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/report/dsr/latest
 * Get latest DSR
 */
export async function getLatestDSRController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/report/weekly
 * Generate Weekly Team Report
 */
export async function generateWeeklyReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/report/monthly
 * Generate Monthly Performance Report
 */
export async function generateMonthlyReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/report/quarterly
 * Generate Quarterly Performance Report
 */
export async function generateQuarterlyReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}
/**
 * POST /api/ai/report/yearly
 * Generate Yearly Strategic Intelligence Report (Enterprise only)
 */
export async function generateYearlyReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/report/status/:jobId
 * Check report generation status
 */
export async function getReportStatusController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/report/history
 * Get report history
 */
export async function getReportHistoryController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/report/:reportId
 * Get specific report
 */
export async function getReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/report/export/:reportId
 * Export report to PDF/CSV/JSON
 */
export async function exportReportController(req, res, next) {
  try {
    deprecated();
  } catch (error) {
    next(error);
  }
}
