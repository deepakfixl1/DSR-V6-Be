import { Queue, Worker } from "bullmq";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import ReportInstance from "#db/models/ReportInstance.model.js";
import { checkBlockerSlaBreaches } from "#api/modules/blockers/blocker.sla.service.js";
import { DataAccessGrant, Tenant, TenantMembership, TenantUsage, WorkGoal, WorkReport } from "#db/models/index.js";

// Queues are created lazily inside initializeFrameworkQueues() so that
// they don't immediately open connections on module import (which crashes
// the process when Redis is unavailable / rate-limited).
// We use a container object so that eventBus.js always reads the latest refs.
const _queues = { ai: null, maintenance: null };

let aiWorker = null;
let maintenanceWorker = null;

/** Getter so callers always see the current queue ref. */
export const getAiQueue = () => _queues.ai;
export const getMaintenanceQueue = () => _queues.maintenance;

// ── Throttled error logger ─────────────────────────────────────────────
// BullMQ emits connection errors in a tight loop when Redis is unreachable.
// Without throttling, hundreds of log lines per second flood stdout and
// can crash the process via buffer overflow / OOM.
const _errorTimestamps = {};           // label → last-logged epoch ms
const ERROR_LOG_INTERVAL_MS = 30_000;  // log at most once per 30 s per label

function safeOn(emitter, label) {
  if (emitter && typeof emitter.on === "function") {
    emitter.on("error", (err) => {
      const now = Date.now();
      const last = _errorTimestamps[label] || 0;
      if (now - last >= ERROR_LOG_INTERVAL_MS) {
        _errorTimestamps[label] = now;
        logger.warn(`BullMQ ${label} error (non-fatal): ${err?.message ?? err}`);
      }
      // Otherwise silently swallow — the error is already known.
    });
  }
}

// ── BullMQ connection options ──────────────────────────────────────────
// maxRetriesPerRequest: null is required by BullMQ workers / queues.
// We add an exponential-backoff retryStrategy so that when Upstash (or
// any Redis) is rate-limited / unreachable the connection backs off
// gracefully instead of hammering the server in a tight loop.
function makeBullMQConnection() {
  return {
    ...redisConfig.bullmqConnection,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      // exponential backoff: 500ms → 1s → 2s → 4s → … capped at 30s
      return Math.min(Math.pow(2, times) * 500, 30_000);
    },
    enableOfflineQueue: false,
  };
}

export const initializeFrameworkQueues = async () => {
  const conn = makeBullMQConnection();

  try {
    _queues.ai = new Queue("aiQueue", { connection: conn });
    safeOn(_queues.ai, "aiQueue");

    _queues.maintenance = new Queue("maintenanceQueue", { connection: conn });
    safeOn(_queues.maintenance, "maintenanceQueue");

    aiWorker = new Worker(
      "aiQueue",
      async (job) => {
        if (job.name === "summarize_report") {
          const { reportId } = job.data;
          await ReportInstance.updateOne(
            { _id: reportId },
            { $set: { "AIAnalysis.summary": "Summary queued for AI processing." } }
          );
        }
      },
      { connection: conn, autorun: true }
    );
    safeOn(aiWorker, "aiWorker");

    maintenanceWorker = new Worker(
      "maintenanceQueue",
      async (job) => {
        if (job.name === "check_blocker_sla") {
          await checkBlockerSlaBreaches();
        } else if (job.name === "goal_overdue_detection") {
          await WorkGoal.updateMany(
            { status: { $nin: ["COMPLETED", "CARRIED_FORWARD"] }, "timeline.dueDate": { $lt: new Date() } },
            { $set: { status: "BLOCKED" } }
          );
        } else if (job.name === "report_deadline_reminders") {
          await WorkReport.updateMany(
            { status: "DRAFT", submissionDeadline: { $lte: new Date(Date.now() + 24 * 3600 * 1000) } },
            { $set: { isLate: false } }
          );
        } else if (job.name === "tenant_usage_snapshots") {
          const monthKey = new Date().toISOString().slice(0, 7).replace("-", "");
          const tenants = await Tenant.find({}).select("_id").lean();
          for (const tenant of tenants) {
            const activeUsers = await TenantMembership.countDocuments({ tenantId: tenant._id, status: "active" });
            await TenantUsage.findOneAndUpdate(
              { tenantId: tenant._id, monthKey },
              { $set: { activeUsers }, $setOnInsert: { apiCalls: 0, storageBytes: 0 } },
              { upsert: true, new: true }
            );
          }
        } else if (job.name === "data_access_grant_expiry") {
          await DataAccessGrant.deleteMany({ expiresAt: { $lte: new Date() } });
        }
      },
      { connection: conn, autorun: true }
    );
    safeOn(maintenanceWorker, "maintenanceWorker");

    await _queues.maintenance.add(
      "check_blocker_sla",
      {},
      {
        repeat: { pattern: "0 2 * * *" },
        jobId: "daily_check_blocker_sla",
      }
    );
    await _queues.maintenance.add("goal_overdue_detection", {}, { repeat: { pattern: "0 1 * * *" }, jobId: "goal_overdue_detection" });
    await _queues.maintenance.add("report_deadline_reminders", {}, { repeat: { pattern: "0 */6 * * *" }, jobId: "report_deadline_reminders" });
    await _queues.maintenance.add("tenant_usage_snapshots", {}, { repeat: { pattern: "0 0 * * *" }, jobId: "tenant_usage_snapshots" });
    await _queues.maintenance.add("data_access_grant_expiry", {}, { repeat: { pattern: "0 * * * *" }, jobId: "data_access_grant_expiry" });

    logger.info("Framework queues initialized");
  } catch (error) {
    // Initial connection failed — close anything we partially opened so
    // dangling connections don't keep retrying in the background.
    logger.warn({ err: error }, "Framework queues failed to initialize — server will start without background jobs (Redis may be unavailable or rate-limited)");
    await safeCloseAll();
  }
};

async function safeCloseAll() {
  try {
    await Promise.allSettled([
      aiWorker?.close().catch(() => {}),
      maintenanceWorker?.close().catch(() => {}),
      _queues.ai?.close().catch(() => {}),
      _queues.maintenance?.close().catch(() => {}),
    ]);
  } catch { /* swallow */ }
  aiWorker = null;
  maintenanceWorker = null;
  _queues.ai = null;
  _queues.maintenance = null;
}

export const closeFrameworkQueues = async () => {
  await safeCloseAll();
};
