import { getRedisClient } from "#infra/cache/redis.js";

export const aiMemoryKeys = Object.freeze({
  context: (tenantId) => `ai:context:${tenantId}`,
  summary: (taskId) => `ai:summary:${taskId}`,
  risk: (projectId) => `ai:risk:${projectId}`,
  report: (reportId) => `ai:report:${reportId}`
});

export async function getShortTermContext(tenantId) {
  const redis = getRedisClient();
  if (!redis?.isOpen) return null;
  const raw = await redis.get(aiMemoryKeys.context(tenantId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function setShortTermContext(tenantId, value, ttlSeconds = 3600) {
  const redis = getRedisClient();
  if (!redis?.isOpen) return null;
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  await redis.set(aiMemoryKeys.context(tenantId), payload, { EX: ttlSeconds });
  return true;
}

export async function appendShortTermContext(tenantId, entry, ttlSeconds = 3600) {
  const existing = (await getShortTermContext(tenantId)) || [];
  const next = Array.isArray(existing) ? existing.slice(-20) : [existing];
  next.push(entry);
  return setShortTermContext(tenantId, next, ttlSeconds);
}

export async function cacheInsight(key, value, ttlSeconds = 3600) {
  const redis = getRedisClient();
  if (!redis?.isOpen) return null;
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  await redis.set(key, payload, { EX: ttlSeconds });
  return true;
}

export async function getCachedInsight(key) {
  const redis = getRedisClient();
  if (!redis?.isOpen) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
