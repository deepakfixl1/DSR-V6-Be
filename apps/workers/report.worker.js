/**
 * Report Worker. Processes both AI report generation and standard report generation jobs from BullMQ.
 */

import mongoose from "mongoose";
import { redisConfig } from "#api/config/redis.config.js";
import { dbConfig } from "#api/config/db.config.js";
import { connectRedis } from "#infra/cache/redis.js";
import { startReportWorker } from "#api/modules/reporting/reportQueue.worker.js";
import { startScheduler } from "#api/modules/reporting/reportScheduler.worker.js";
import { startReminderScheduler } from "#api/modules/workReports/reportReminder.scheduler.js";
import { logger } from "#api/utils/logger.js";

// Connect to MongoDB
await mongoose.connect(dbConfig.uri, dbConfig.options);
logger.info("Report worker connected to MongoDB");

// Connect to Redis
await connectRedis(redisConfig);
logger.info("Report worker connected to Redis");

// ============================================================================
// Standard Report Generation Worker (New Reporting Engine)
// ============================================================================

const reportWorker = startReportWorker();
logger.info("Standard report worker started");

// ============================================================================
// Report Scheduler (Runs every minute)
// ============================================================================

startScheduler(60000);
logger.info("Report scheduler started (runs every 60 seconds)");

// ============================================================================
// Reminder & Penalty Scheduler (Runs every minute)
// ============================================================================

startReminderScheduler(60000);
logger.info("Report reminder scheduler started (runs every 60 seconds)");

// ============================================================================
// Graceful Shutdown
// ============================================================================

const shutdown = async () => {
  logger.info("Shutting down report workers...");
  
  try {
    await reportWorker.close();
    
    await mongoose.connection.close();
    logger.info("Report workers shut down successfully");
    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("All report workers and scheduler initialized successfully");
