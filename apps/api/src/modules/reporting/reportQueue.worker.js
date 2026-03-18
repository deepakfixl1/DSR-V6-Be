import { Worker } from "bullmq";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { cacheKeys } from "#infra/cache/keys.js";
import { config } from "#api/config/env.js";
import { executeReport } from "./reportExecution.service.js";

/**
 * BullMQ Worker for report generation
 */

const LOCK_TTL = 600; // 10 minutes

export function createReportWorker() {
  const worker = new Worker(
    "reports.generate",
    async (job) => {
      const { runId, tenantId, templateId, scheduleId, period, scope, outputFormats } = job.data;

      logger.info({
        jobId: job.id,
        runId,
        tenantId,
        templateId
      }, "Processing report generation job");

      const redis = getRedisClient();

      // Acquire Redis lock to prevent duplicate runs
      const lockKey = cacheKeys.distributedLockKey({
        env: config.app.env,
        tenantId,
        resource: "report-run",
        id: runId,
        clusterTenantTag: true
      });

      let lockAcquired = false;

      try {
        lockAcquired = await redis.set(lockKey, "locked", {
          NX: true,
          EX: LOCK_TTL
        });

        if (!lockAcquired) {
          logger.warn({
            jobId: job.id,
            runId,
            tenantId
          }, "Report run lock already held, skipping duplicate execution");
          return { success: false, reason: "duplicate" };
        }

        // Execute the report
        const result = await executeReport({
          runId,
          tenantId,
          templateId,
          period,
          scope,
          outputFormats
        });

        logger.info({
          jobId: job.id,
          runId,
          tenantId,
          durationMs: result.durationMs
        }, "Report generation job completed");

        return result;
      } catch (error) {
        logger.error({
          jobId: job.id,
          runId,
          tenantId,
          error: error.message,
          stack: error.stack
        }, "Report generation job failed");

        throw error;
      } finally {
        // Release lock
        if (lockAcquired) {
          try {
            await redis.del(lockKey);
          } catch (error) {
            logger.error({
              runId,
              error: error.message
            }, "Failed to release report run lock");
          }
        }
      }
    },
    {
      connection: redisConfig.bullmqConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000 // 10 jobs per minute
      }
    }
  );

  worker.on("completed", (job, result) => {
    logger.info({
      jobId: job.id,
      runId: job.data.runId,
      result
    }, "Report job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({
      jobId: job?.id,
      runId: job?.data?.runId,
      error: error.message,
      attempts: job?.attemptsMade
    }, "Report job failed");
  });

  worker.on("error", (error) => {
    logger.error({
      error: error.message,
      stack: error.stack
    }, "Report worker error");
  });

  logger.info("Report generation worker started");

  return worker;
}

/**
 * Start the worker
 */
export function startReportWorker() {
  return createReportWorker();
}
