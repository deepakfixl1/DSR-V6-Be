/**
 * AI Worker. Processes AI background jobs from BullMQ.
 */

import mongoose from "mongoose";
import { redisConfig } from "#api/config/redis.config.js";
import { dbConfig } from "#api/config/db.config.js";
import { connectRedis } from "#infra/cache/redis.js";
import { startAIWorkers } from "#api/modules/ai/ai.queue.js";
import { logger } from "#api/utils/logger.js";

// Connect to MongoDB
await mongoose.connect(dbConfig.uri, dbConfig.options);
logger.info("AI worker connected to MongoDB");

// Connect to Redis
await connectRedis(redisConfig);
logger.info("AI worker connected to Redis");

// Start AI workers
const workers = startAIWorkers();
logger.info({ count: workers.length }, "AI workers started");

const shutdown = async () => {
  logger.info("Shutting down AI workers...");
  try {
    await Promise.all(workers.map((worker) => worker.close()));
    await mongoose.connection.close();
    logger.info("AI workers shut down successfully");
    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message }, "Error during AI worker shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
