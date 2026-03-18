/**
 * Export Worker. Processes report export jobs from BullMQ.
 */

import { Worker } from "bullmq";
import Redis from "redis";
import mongoose from "mongoose";
import { redisConfig } from "#api/config/redis.config.js";
import { dbConfig } from "#api/config/db.config.js";
import { exportReport } from "#api/modules/reporting/report.export.service.js";
import {logger} from "#api/utils/logger.js";

// Connect to MongoDB
await mongoose.connect(dbConfig.uri, dbConfig.options);
logger.info("Export worker connected to MongoDB");

const redisConnection = Redis.createClient(redisConfig);

// Export worker
const exportWorker = new Worker(
  "ai-report-export",
  async (job) => {
    const { reportId, format, tenantId } = job.data;

    logger.info("Processing export job", { jobId: job.id, reportId, format });

    try {
      const result = await exportReport(
        mongoose.Types.ObjectId(reportId),
        format,
        mongoose.Types.ObjectId(tenantId)
      );

      logger.info("Export job completed", { jobId: job.id, reportId, format, fileUrl: result.fileUrl });

      return { success: true, fileUrl: result.fileUrl };

    } catch (error) {
      logger.error("Export job failed", { jobId: job.id, reportId, format, error: error.message });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000 // 20 exports per minute
    }
  }
);

exportWorker.on("completed", (job) => {
  logger.info("Export worker job completed", { jobId: job.id });
});

exportWorker.on("failed", (job, err) => {
  logger.error("Export worker job failed", { jobId: job?.id, error: err.message });
});

logger.info("Export worker started");
