import { getMongoReadyState } from "#db/connection/mongoose.js";
import { isRedisReady } from "#infra/cache/redis.js";
import * as auditService from "#api/modules/audit/audit.service.js";
import { logger } from "#api/utils/logger.js";

export class HealthController {
  live = async (_req, res) => {
    return res.status(200).json({
      status: "ok",
      service: "api"
    });
  };

  ready = async (_req, res) => {
    const mongoReady = getMongoReadyState() === 1;
    const redisReady = await isRedisReady();
    const isReady = mongoReady && redisReady;

    if (!isReady) {
      await auditService
        .log({
          action: "SYSTEM.HEALTH_CHECK_FAIL",
          resourceType: "System",
          resourceId: null,
          userId: null,
          tenantId: null,
          metadata: { mongo: mongoReady ? "up" : "down", redis: redisReady ? "up" : "down" }
        })
        .catch((err) => logger.warn({ err }, "Audit log failed"));
    }

    return res.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "not_ready",
      checks: {
        mongo: mongoReady ? "up" : "down",
        redis: redisReady ? "up" : "down"
      }
    });
  };
}
