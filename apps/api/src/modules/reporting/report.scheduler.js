/**
 * Report Scheduler. Cron-based scheduler for automated report generation.
 */

import { logger } from "#api/utils/logger.js";

/**
 * Schedule Daily Status Report (DSR) - Every day at 6 AM
 */
export function scheduleDSR() {
  logger.info("DSR scheduler disabled: AI auto-generation is deprecated");
}

/**
 * Schedule Weekly Team Report - Every Monday at 7 AM
 */
export function scheduleWeeklyReport() {
  logger.info("Weekly report scheduler disabled: AI auto-generation is deprecated");
}

/**
 * Schedule Monthly Performance Report - First day of month at 8 AM
 */
export function scheduleMonthlyReport() {
  logger.info("Monthly report scheduler disabled: AI auto-generation is deprecated");
}

/**
 * Schedule Yearly Strategic Report - January 1st at 9 AM (Enterprise only)
 */
export function scheduleYearlyReport() {
  logger.info("Yearly report scheduler disabled: AI auto-generation is deprecated");
}

/**
 * Initialize all schedulers
 */
export function initializeReportSchedulers() {
  scheduleDSR();
  scheduleWeeklyReport();
  scheduleMonthlyReport();
  scheduleYearlyReport();
  
  logger.info("All report schedulers initialized");
}
