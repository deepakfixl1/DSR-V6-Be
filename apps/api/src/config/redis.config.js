import { config } from "#api/config/env.js";

const redisUrl = new URL(config.redis.url);
const redisTls = redisUrl.protocol === "rediss:";

export const redisConfig = Object.freeze({
  url: config.redis.url,
  socket: {
    tls: redisTls
  },
  bullmqConnection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.replace("/", "")) || 0 : 0,
    tls: redisTls ? {} : undefined
  }
});
