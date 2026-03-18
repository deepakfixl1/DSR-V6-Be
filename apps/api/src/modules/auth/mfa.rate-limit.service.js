import { config } from "#api/config/env.js";
import { getRedisClient } from "#infra/cache/redis.js";
import { cacheKeys } from "#infra/cache/keys.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 15 * 60;
const ATTEMPT_TTL_SECONDS = 15 * 60;
const CHALLENGE_TTL_SECONDS = 5 * 60;

const memoryStore = new Map();

const nowMs = () => Date.now();

const setMemory = (key, value, ttlSeconds) => {
  const expiresAt = ttlSeconds ? nowMs() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value, expiresAt });
};

const getMemory = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const deleteMemory = (key) => {
  memoryStore.delete(key);
};

const attemptsKey = (userId) =>
  cacheKeys.buildKey({
    env: config.app.env,
    scope: "global",
    module: "mfa",
    type: "attempts",
    id: userId,
    clusterTenantTag: false
  });

const lockKey = (userId) =>
  cacheKeys.buildKey({
    env: config.app.env,
    scope: "global",
    module: "mfa",
    type: "lock",
    id: userId,
    clusterTenantTag: false
  });

const challengeKey = (challengeId) =>
  cacheKeys.buildKey({
    env: config.app.env,
    scope: "global",
    module: "mfa",
    type: "challenge",
    id: challengeId,
    clusterTenantTag: false
  });

export async function isUserLocked(userId) {
  const redis = getRedisClient();
  const key = lockKey(userId);
  if (redis) {
    const locked = await redis.get(key);
    return !!locked;
  }
  return !!getMemory(key);
}

export async function incrementAttempts(userId) {
  const redis = getRedisClient();
  const attemptsKeyName = attemptsKey(userId);
  const lockKeyName = lockKey(userId);

  if (redis) {
    const attempts = await redis.incr(attemptsKeyName);
    if (attempts === 1) {
      await redis.expire(attemptsKeyName, ATTEMPT_TTL_SECONDS);
    }
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redis.set(lockKeyName, "locked", { EX: LOCK_DURATION_SECONDS });
    }
    return attempts;
  }

  const current = Number(getMemory(attemptsKeyName) || 0) + 1;
  setMemory(attemptsKeyName, current, ATTEMPT_TTL_SECONDS);
  if (current >= MAX_FAILED_ATTEMPTS) {
    setMemory(lockKeyName, "locked", LOCK_DURATION_SECONDS);
  }
  return current;
}

export async function resetAttempts(userId) {
  const redis = getRedisClient();
  const attemptsKeyName = attemptsKey(userId);
  const lockKeyName = lockKey(userId);
  if (redis) {
    await redis.del(attemptsKeyName, lockKeyName);
    return true;
  }
  deleteMemory(attemptsKeyName);
  deleteMemory(lockKeyName);
  return true;
}

export async function getLockTimeRemaining(userId) {
  const redis = getRedisClient();
  const key = lockKey(userId);
  if (redis) {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
  const entry = memoryStore.get(key);
  if (!entry?.expiresAt) return 0;
  const remainingMs = entry.expiresAt - nowMs();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export async function storeMFAChallenge(challengeId, data, ttlSeconds = CHALLENGE_TTL_SECONDS) {
  const redis = getRedisClient();
  const key = challengeKey(challengeId);
  const payload = JSON.stringify(data);
  if (redis) {
    await redis.set(key, payload, { EX: ttlSeconds });
    return true;
  }
  setMemory(key, payload, ttlSeconds);
  return true;
}

export async function getMFAChallenge(challengeId) {
  const redis = getRedisClient();
  const key = challengeKey(challengeId);
  let payload;
  if (redis) {
    payload = await redis.get(key);
  } else {
    payload = getMemory(key);
  }
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function deleteMFAChallenge(challengeId) {
  const redis = getRedisClient();
  const key = challengeKey(challengeId);
  if (redis) {
    await redis.del(key);
    return true;
  }
  deleteMemory(key);
  return true;
}

export async function getRateLimitStatus(userId) {
  const redis = getRedisClient();
  const attemptsKeyName = attemptsKey(userId);
  const lockKeyName = lockKey(userId);

  if (redis) {
    const [attemptsRaw, lockTtl] = await Promise.all([
      redis.get(attemptsKeyName),
      redis.ttl(lockKeyName)
    ]);
    return {
      attempts: Number(attemptsRaw || 0),
      maxAttempts: MAX_FAILED_ATTEMPTS,
      locked: lockTtl > 0,
      lockSecondsRemaining: lockTtl > 0 ? lockTtl : 0
    };
  }

  const attempts = Number(getMemory(attemptsKeyName) || 0);
  const lockSecondsRemaining = await getLockTimeRemaining(userId);
  return {
    attempts,
    maxAttempts: MAX_FAILED_ATTEMPTS,
    locked: lockSecondsRemaining > 0,
    lockSecondsRemaining
  };
}
