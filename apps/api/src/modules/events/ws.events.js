import { publish } from "#infra/pubsub/publisher.js";
import { pubsubChannels } from "#infra/cache/keys.js";
import { config } from "#api/config/env.js";

const env = config.app.env;

export const publishWsEvent = async ({ tenantId, event, room = "tenant", payload = {} }) => {
  const channel = pubsubChannels.wsBroadcast({
    env,
    tenantId: tenantId ?? "_",
    clusterTenantTag: false,
  });

  await publish(channel, {
    event,
    room,
    tenantId: tenantId ? String(tenantId) : null,
    payload,
    emittedAt: new Date().toISOString(),
  });
};
