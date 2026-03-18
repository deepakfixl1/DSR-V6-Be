/**
 * Notification publisher. Publishes notification.created events to Redis Pub/Sub.
 * All real-time events flow through Redis; no direct socket emission.
 */

import { publish } from "#infra/pubsub/publisher.js";

/**
 * Publishes notification.created to the given channel.
 * @param {string} channel - Channel from pubsubChannels.notificationCreated()
 * @param {object} payload - Serializable notification payload
 * @returns {Promise<void>}
 */
export async function publishNotificationCreated(channel, payload) {
  await publish(channel, payload);
}
