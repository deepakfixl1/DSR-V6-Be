/**
 * WebSocket server. Separate process; JWT auth, Redis Pub/Sub, graceful shutdown.
 */

import { createServer } from "node:http";
import { config } from "#api/config/env.js";
import { redisConfig } from "#api/config/redis.config.js";
import { logger } from "#api/utils/logger.js";
import { createSocketServer } from "#infra/socket/socket.server.js";

let io;
let server;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "WS shutdown signal received");

  if (io?.close) {
    await io.close();
  }
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }
  logger.info("WS graceful shutdown complete");
  process.exit(0);
};

const startServer = async () => {
  server = createServer();
  io = await createSocketServer(server, { redisUrl: redisConfig.url });

  server.listen(config.app.wsPort, () => {
    logger.info(
      { service: "ws", port: config.app.wsPort, env: config.app.env },
      "WS server started"
    );
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch(async (error) => {
  logger.error({ err: error }, "WS server failed to start");
  process.exit(1);
});
