/**
 * Redis Pub/Sub publisher. Publishes events to channels for real-time delivery.
 * Uses centralized Redis key builder. No direct socket emission - all real-time
 * events flow through Redis Pub/Sub.
 */

import { getRedisClient } from "#infra/cache/redis.js";
import { logger } from "#api/utils/logger.js";

/**
 * Publishes a message to a Redis Pub/Sub channel.
 * @param {string} channel - Channel name (from pubsubChannels builder)
 * @param {object | string} payload - Serializable payload
 * @returns {Promise<void>}
 */
export async function publish(channel, payload) {
  const client = getRedisClient();
  if (!client?.isOpen) {
    logger.warn({ channel }, "Redis not available, skipping publish");
    return;
  }
  const message = typeof payload === "string" ? payload : JSON.stringify(payload);
  await client.publish(channel, message);
  logger.debug({ channel, payloadSize: message.length }, "Published to channel");
}
