import { createClient } from "redis";
import { logger } from "#api/utils/logger.js";

let redisClient;
let _lastRedisErrorLog = 0;

const buildRedisClient = ({ url, socket = {} }) => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url,
    socket: {
      ...socket,
      reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
    }
  });

  redisClient.on("connect", () => {
    logger.info("Redis connecting");
  });

  redisClient.on("ready", () => {
    logger.info("Redis ready");
    _lastRedisErrorLog = 0;            // reset throttle on successful reconnect
  });

  redisClient.on("reconnecting", () => {
    logger.warn("Redis reconnecting");
  });

  // Throttled error handler — log at most once every 30s
  redisClient.on("error", (error) => {
    const now = Date.now();
    if (now - _lastRedisErrorLog >= 30_000) {
      _lastRedisErrorLog = now;
      logger.error(`Redis error: ${error?.message ?? error}`);
    }
  });

  redisClient.on("end", () => {
    logger.warn("Redis connection ended");
  });

  return redisClient;
};

export const connectRedis = async ({ url, socket = {} }) => {
  const client = buildRedisClient({ url, socket });
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
};

export const getRedisClient = () => redisClient;

export const disconnectRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
};

export const isRedisReady = async () => {
  if (!redisClient?.isOpen) return false;
  try {
    const pong = await redisClient.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
};
