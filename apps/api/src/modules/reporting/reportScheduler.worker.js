import { ReportSchedule } from "#db/models/index.js";
import { logger } from "#api/utils/logger.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { cacheKeys } from "#infra/cache/keys.js";
import { config } from "#api/config/env.js";
import { triggerScheduledRun } from "./reportRun.service.js";
import { computeNextRunAt } from "./reportSchedule.utils.js";

/**
 * Report Scheduler Worker. Runs every minute to check for due schedules and trigger runs.
 */

const LOCK_TTL = 60; // 60 seconds
const SCHEDULER_LOCK_KEY = cacheKeys.distributedLockKey({
  env: config.app.env,
  tenantId: "_",
  resource: "scheduler",
  id: "report-scheduler",
  clusterTenantTag: false
});

export async function processSchedules() {
  const redis = getRedisClient();
  const now = new Date();

  try {
    // Acquire distributed lock to prevent duplicate processing
    const lockAcquired = await redis.set(SCHEDULER_LOCK_KEY, "locked", {
      NX: true,
      EX: LOCK_TTL
    });

    if (!lockAcquired) {
      logger.debug("Scheduler lock already held, skipping");
      return;
    }

    logger.info("Report scheduler started");

    const dueSchedules = await ReportSchedule.find({
      status: "active",
      nextRunAt: { $lte: now }
    }).lean();

    logger.info({ count: dueSchedules.length }, "Found due schedules");

    for (const schedule of dueSchedules) {
      try {
        // Acquire per-schedule lock
        const scheduleLockKey = cacheKeys.distributedLockKey({
          env: config.app.env,
          tenantId: String(schedule.tenantId),
          resource: "schedule",
          id: String(schedule._id),
          clusterTenantTag: true
        });

        const scheduleLockAcquired = await redis.set(scheduleLockKey, "locked", {
          NX: true,
          EX: 300 // 5 minutes
        });

        if (!scheduleLockAcquired) {
          logger.debug({ scheduleId: schedule._id }, "Schedule lock already held, skipping");
          continue;
        }

        // Trigger the scheduled run
        await triggerScheduledRun({
          scheduleId: String(schedule._id),
          tenantId: String(schedule.tenantId)
        });

        // Compute and update next run time
        const nextRunAt = computeNextRunAt(schedule);
        await ReportSchedule.findByIdAndUpdate(schedule._id, {
          lastRunAt: now,
          nextRunAt,
          lastRunStatus: "success"
        });

        logger.info({
          scheduleId: schedule._id,
          tenantId: schedule.tenantId,
          nextRunAt
        }, "Schedule processed successfully");

        // Release schedule lock
        await redis.del(scheduleLockKey);
      } catch (error) {
        logger.error({
          scheduleId: schedule._id,
          error: error.message,
          stack: error.stack
        }, "Failed to process schedule");

        // Update schedule with failure status
        await ReportSchedule.findByIdAndUpdate(schedule._id, {
          lastRunStatus: "failed"
        });
      }
    }

    logger.info("Report scheduler completed");
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack
    }, "Scheduler error");
  } finally {
    // Release scheduler lock
    try {
      await redis.del(SCHEDULER_LOCK_KEY);
    } catch (error) {
      logger.error({ error: error.message }, "Failed to release scheduler lock");
    }
  }
}

/**
 * Start the scheduler with interval
 */
export function startScheduler(intervalMs = 60000) {
  logger.info({ intervalMs }, "Starting report scheduler");

  // Run immediately
  processSchedules();

  // Then run at interval
  setInterval(() => {
    processSchedules();
  }, intervalMs);
}
