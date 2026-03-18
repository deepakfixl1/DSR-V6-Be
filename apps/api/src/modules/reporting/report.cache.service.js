/**
 * Report Cache Service. Redis-based caching for AI reports.
 */

import Redis from "redis";
import { redisConfig } from "#api/config/redis.config.js";
import {logger} from "#api/utils/logger.js";

const redis = Redis.createClient(redisConfig);

await redis.connect();

const CACHE_TTL = {
  DSR: 3600, // 1 hour
  WEEKLY: 86400, // 24 hours
  MONTHLY: 604800, // 7 days
  YEARLY: 2592000 // 30 days
};

/**
 * Generate cache key
 */
function getCacheKey(tenantId, reportType, period) {
  const periodKey = period instanceof Date 
    ? period.toISOString().split('T')[0]
    : period;
  return `ai:report:${tenantId}:${reportType}:${periodKey}`;
}

/**
 * Cache report
 */
export async function cacheReport(tenantId, reportType, period, reportData) {
  const key = getCacheKey(tenantId, reportType, period);
  const ttl = CACHE_TTL[reportType] || 3600;

  try {
    await redis.setEx(key, ttl, JSON.stringify(reportData));
    logger.info("Report cached", { key, ttl });
  } catch (error) {
    logger.error("Failed to cache report", { error: error.message, key });
  }
}

/**
 * Get cached report
 */
export async function getCachedReport(tenantId, reportType, period) {
  const key = getCacheKey(tenantId, reportType, period);

  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info("Report cache hit", { key });
      return JSON.parse(cached);
    }
    logger.info("Report cache miss", { key });
    return null;
  } catch (error) {
    logger.error("Failed to get cached report", { error: error.message, key });
    return null;
  }
}

/**
 * Invalidate report cache
 */
export async function invalidateReportCache(tenantId, reportType, period) {
  const key = getCacheKey(tenantId, reportType, period);

  try {
    await redis.del(key);
    logger.info("Report cache invalidated", { key });
  } catch (error) {
    logger.error("Failed to invalidate cache", { error: error.message, key });
  }
}

/**
 * Cache daily summary for quick access
 */
export async function cacheDailySummary(tenantId, date, summary) {
  const key = `ai:summary:${tenantId}:daily:${date.toISOString().split('T')[0]}`;
  
  try {
    await redis.setEx(key, 86400, JSON.stringify(summary)); // 24 hours
    logger.info("Daily summary cached", { key });
  } catch (error) {
    logger.error("Failed to cache daily summary", { error: error.message });
  }
}

/**
 * Get cached daily summary
 */
export async function getCachedDailySummary(tenantId, date) {
  const key = `ai:summary:${tenantId}:daily:${date.toISOString().split('T')[0]}`;
  
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error("Failed to get cached daily summary", { error: error.message });
    return null;
  }
}

/**
 * Cache yearly report (special handling for strategic reports)
 */
export async function cacheYearlyReport(tenantId, year, reportData) {
  const key = `ai:report:${tenantId}:yearly:${year}`;
  
  try {
    await redis.setEx(key, CACHE_TTL.YEARLY, JSON.stringify(reportData));
    logger.info("Yearly report cached", { key, year });
  } catch (error) {
    logger.error("Failed to cache yearly report", { error: error.message });
  }
}

/**
 * Get all cached report keys for a tenant
 */
export async function getTenantCachedReports(tenantId) {
  const pattern = `ai:report:${tenantId}:*`;
  
  try {
    const keys = await redis.keys(pattern);
    return keys;
  } catch (error) {
    logger.error("Failed to get tenant cached reports", { error: error.message });
    return [];
  }
}

/**
 * Clear all report cache for a tenant
 */
export async function clearTenantReportCache(tenantId) {
  const keys = await getTenantCachedReports(tenantId);
  
  if (keys.length === 0) {
    return 0;
  }

  try {
    await redis.del(keys);
    logger.info("Tenant report cache cleared", { tenantId, keysCleared: keys.length });
    return keys.length;
  } catch (error) {
    logger.error("Failed to clear tenant cache", { error: error.message });
    return 0;
  }
}
