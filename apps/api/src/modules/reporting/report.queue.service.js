/**
 * Report Queue Service. Handles BullMQ job enqueueing for report generation and export.
 */

import { Queue } from "bullmq";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";

// Create queues with BullMQ connection config
export const reportQueue = new Queue("reports.generate", {
  connection: redisConfig.bullmqConnection
});

export const exportQueue = new Queue("reports.export", {
  connection: redisConfig.bullmqConnection
});

/**
 * Enqueue report generation job
 */
export async function enqueueReportJob({ runId, tenantId, templateId, scheduleId, period, scope, outputFormats }) {
  const jobData = {
    runId,
    tenantId,
    templateId,
    scheduleId,
    period,
    scope,
    outputFormats
  };

  console.log(jobData);
  const job = await reportQueue.add("generate-report", jobData, {
    jobId: runId,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  });

  logger.info({
    jobId: job.id,
    runId,
    tenantId,
    templateId
  }, "Report generation job enqueued");

  return job.id;
}

/**
 * Enqueue export job
 */
export async function enqueueExportJob({ reportId, format, tenantId, userId }) {
  const jobData = {
    reportId: reportId.toString(),
    format,
    tenantId: tenantId.toString(),
    userId: userId ? userId.toString() : null
  };

  const job = await exportQueue.add(`export-${format.toLowerCase()}`, jobData, {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 3000
    },
    removeOnComplete: 50,
    removeOnFail: 20
  });

  logger.info({ jobId: job.id, reportId, format }, "Export job enqueued");

  return job.id;
}
