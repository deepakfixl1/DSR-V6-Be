/**
 * Redis Pub/Sub subscriber. Subscribes to channels and invokes handlers.
 * Uses a dedicated Redis connection (subscribe mode requires exclusive client).
 */

import { createClient } from "redis";
import { logger } from "#api/utils/logger.js";

/** @type {import('redis').RedisClientType | null} */
let subscriberClient = null;

/**
 * Creates and connects a dedicated subscriber client.
 * @param {{ url: string, socket?: object }} options
 * @returns {Promise<import('redis').RedisClientType>}
 */
export async function createSubscriberClient({ url, socket = {} }) {
  if (subscriberClient?.isOpen) return subscriberClient;

  subscriberClient = createClient({
    url,
    socket: {
      ...socket,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
  });

  subscriberClient.on("error", (err) => {
    logger.error({ err }, "PubSub subscriber error");
  });
  subscriberClient.on("reconnecting", () => {
    logger.warn("PubSub subscriber reconnecting");
  });

  await subscriberClient.connect();
  logger.info("PubSub subscriber connected");
  return subscriberClient;
}

/**
 * Subscribes to one or more channels and invokes handler on messages.
 * @param {import('redis').RedisClientType} client - Subscriber client
 * @param {string[]} channels - Channel names
 * @param {(channel: string, message: string) => void | Promise<void>} handler
 * @returns {Promise<void>}
 */
export async function subscribe(client, channels, handler) {
  const wrappedHandler = (channel, message) => {
    Promise.resolve(handler(channel, message)).catch((err) => {
      logger.error({ err, channel }, "PubSub handler error");
    });
  };
  client.on("message", wrappedHandler);
  await client.subscribe(channels);
  logger.info({ channels }, "Subscribed to PubSub channels");
}

/**
 * Pattern-subscribes to channels and invokes handler on messages.
 * @param {import('redis').RedisClientType} client
 * @param {string[]} patterns
 * @param {(channel: string, message: string) => void | Promise<void>} handler
 * @returns {Promise<void>}
 */
export async function pSubscribe(client, patterns, handler) {
  const wrappedHandler = (channel, message) => {
    Promise.resolve(handler(channel, message)).catch((err) => {
      logger.error({ err, channel }, "PubSub pattern handler error");
    });
  };
  client.on("pmessage", (_, channel, message) => wrappedHandler(channel, message));
  await client.pSubscribe(patterns);
  logger.info({ patterns }, "Subscribed to PubSub patterns");
}

/**
 * Unsubscribes from channels.
 * @param {import('redis').RedisClientType} client
 * @param {string[]} [channels]
 * @returns {Promise<void>}
 */
export async function unsubscribe(client, channels) {
  await client.unsubscribe(channels ?? []);
}

/**
 * Disconnects the subscriber client.
 * @returns {Promise<void>}
 */
export async function disconnectSubscriber() {
  if (subscriberClient?.isOpen) {
    await subscriberClient.quit();
    subscriberClient = null;
    logger.info("PubSub subscriber disconnected");
  }
}
