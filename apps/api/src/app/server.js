import { app } from "#api/app/app.js";
import { config } from "#api/config/env.js";
import { dbConfig } from "#api/config/db.config.js";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import { connectMongo, disconnectMongo } from "#db/connection/mongoose.js";
import { connectRedis, disconnectRedis, getRedisClient } from "#infra/cache/redis.js";
import { createEmailQueue, closeEmailQueue } from "#infra/queue/email.queue.js";
import { initializeReportSchedulers } from "#api/modules/reporting/report.scheduler.js";
import { createOpenAIClient, healthCheck } from "#api/modules/ai/ai.openai.js";
import Tenant from "#db/models/Tenant.model.js";
import { registerDefaultHandlers } from "#api/modules/events/eventBus.js";
import { initializeFrameworkQueues, closeFrameworkQueues } from "#api/modules/events/queues.js";
import { registerAutomationHandlers } from "#api/modules/automations/automation.engine.js";

// ── Global safety net: prevent unhandled BullMQ / Redis errors from crashing ──
let _lastUnhandledRejLog = 0;
process.on("unhandledRejection", (reason) => {
  // Throttle logging — BullMQ can fire dozens per second when Redis is down
  const now = Date.now();
  if (now - _lastUnhandledRejLog < 30_000) return;
  _lastUnhandledRejLog = now;
  const msg = reason?.message ?? String(reason ?? "unknown");
  logger.warn(`Unhandled rejection (non-fatal): ${msg.slice(0, 200)}`);
});
let _lastUncaughtLog = 0;
process.on("uncaughtException", (err) => {
  // Only fatal if it's NOT a Redis/BullMQ connection error
  const msg = String(err?.message ?? "");
  if (msg.includes("max requests limit") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET")) {
    const now = Date.now();
    if (now - _lastUncaughtLog >= 30_000) {
      _lastUncaughtLog = now;
      logger.warn(`Uncaught Redis/connection exception (non-fatal): ${msg.slice(0, 200)}`);
    }
    return;
  }
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

let server;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutdown signal received");

  const closeServer = () =>
    new Promise((resolve) => {
      if (!server) {
        resolve();
        return;
      }
      server.close(() => resolve());
    });

  await Promise.allSettled([closeServer(), closeEmailQueue(), disconnectRedis(), disconnectMongo()]);
  await Promise.allSettled([closeFrameworkQueues()]);
  logger.info("Graceful shutdown complete");
  process.exit(0);
};

const startServer = async () => {
  await connectMongo(dbConfig);

  // --- Redis & queues (non-fatal) ---
  try {
    await connectRedis({ url: redisConfig.url, socket: redisConfig.socket });
    createEmailQueue({
      redisClient: getRedisClient(),
      connection: redisConfig.bullmqConnection,
    });
    logger.info("Redis connected and email queue created");
  } catch (err) {
    logger.warn({ err }, "Redis unavailable — server will start without Redis-backed features (queues, caching)");
  }

  registerDefaultHandlers();
  registerAutomationHandlers();

  // Framework queues (non-fatal — depends on Redis)
  try {
    await initializeFrameworkQueues();
  } catch (err) {
    logger.warn({ err }, "Framework queues failed — background jobs disabled");
  }

  // --- OpenAI (non-fatal) ---
  try {
    await createOpenAIClient();
    const openaiOk = await healthCheck();
    if (!openaiOk) throw new Error("OpenAI health check returned false");
    logger.info("OpenAI client ready");
  } catch (err) {
    logger.warn({ err }, "OpenAI unavailable — AI features will be disabled");
  }

  // Initialize AI report schedulers (safe — it only registers cron timers)
  try {
    initializeReportSchedulers();
  } catch (err) {
    logger.warn({ err }, "Report schedulers failed to initialize");
  }

  server = app.listen(config.app.port, () => {
    logger.info(
      {
        port: config.app.port,
        env: config.app.env
      },
      "API server started"
    );
  });

  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
};

startServer().catch(async (error) => {
  logger.error({ err: error }, "Failed to start server");
  await Promise.allSettled([closeEmailQueue(), closeFrameworkQueues(), disconnectRedis(), disconnectMongo()]);
  process.exit(1);
});
