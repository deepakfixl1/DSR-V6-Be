const ENV_SHORT = Object.freeze({
  development: "dev",
  test: "stg",
  production: "prod",
  dev: "dev",
  stg: "stg",
  prod: "prod"
});

const normalizeEnv = (env) => ENV_SHORT[(env || "").toLowerCase()] || "dev";

const encode = (value) => String(value).trim().replaceAll(" ", "_");

const tenantSegment = ({ tenantId, clusterTenantTag }) => {
  const safe = tenantId ? encode(tenantId) : "_";
  return clusterTenantTag ? `{${safe}}` : safe;
};

const idSegments = (id) => {
  if (Array.isArray(id)) return id.map((item) => encode(item));
  if (id === undefined || id === null || id === "") return ["_"];
  return [encode(id)];
};

const buildKey = ({
  env,
  scope = "t",
  tenantId = "_",
  module,
  type,
  id,
  clusterTenantTag = true
}) => {
  const effectiveEnv = normalizeEnv(env);
  const effectiveTenant = scope === "global" ? "_" : tenantSegment({ tenantId, clusterTenantTag });
  return [effectiveEnv, scope, effectiveTenant, encode(module), encode(type), ...idSegments(id)].join(":");
};

const buildChannel = ({ env, scope = "t", tenantId = "_", topic, clusterTenantTag = true }) => {
  const effectiveEnv = normalizeEnv(env);
  const effectiveTenant = scope === "global" ? "_" : tenantSegment({ tenantId, clusterTenantTag });
  return [effectiveEnv, "pubsub", scope, effectiveTenant, encode(topic)].join(":");
};

export const otpKey = ({ env, tenantId, purpose, identifier, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "otp",
    type: purpose,
    id: identifier,
    clusterTenantTag
  });

export const otpAttemptsKey = ({ env, tenantId, purpose, identifier, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "otp",
    type: "attempts",
    id: [purpose, identifier],
    clusterTenantTag
  });

export const otpLockKey = ({ env, tenantId, purpose, identifier, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "otp",
    type: "lock",
    id: [purpose, identifier],
    clusterTenantTag
  });

export const refreshKey = ({ env, tenantId, refreshId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "refresh",
    id: refreshId,
    clusterTenantTag
  });

export const userRefreshSetKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "user_refresh_set",
    id: userId,
    clusterTenantTag
  });

export const blacklistJtiKey = ({ env, tenantId, jti, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "blacklist",
    id: ["jti", jti],
    clusterTenantTag
  });

export const authSessionKey = ({ env, tenantId, sessionId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "session",
    id: sessionId,
    clusterTenantTag
  });

export const passwordResetKey = ({ env, tenantId, token, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "pwdreset",
    id: token,
    clusterTenantTag
  });

export const globalRateIpKey = ({ env, ip, route = "default" }) =>
  buildKey({
    env,
    scope: "global",
    module: "rate",
    type: "ip",
    id: [ip, route],
    clusterTenantTag: false
  });

export const tenantRateUserLoginKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "rate",
    type: "user_login",
    id: userId,
    clusterTenantTag
  });

export const tenantRateOtpSendKey = ({ env, tenantId, identifier, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "rate",
    type: "otp_send",
    id: identifier,
    clusterTenantTag
  });

export const authDeviceKey = ({ env, tenantId, userId, deviceId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "auth",
    type: "device",
    id: [userId, deviceId],
    clusterTenantTag
  });

export const permSetKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "rbac",
    type: "permset",
    id: userId,
    clusterTenantTag
  });

export const permHashKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "rbac",
    type: "permhash",
    id: userId,
    clusterTenantTag
  });

export const roleCacheKey = ({ env, tenantId, roleId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "rbac",
    type: "role",
    id: roleId,
    clusterTenantTag
  });

export const navTreeKey = ({ env, tenantId, roleId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "nav",
    type: "tree",
    id: roleId,
    clusterTenantTag
  });

export const tenantConfigKey = ({ env, tenantId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "tenant",
    type: "config",
    id: "_",
    clusterTenantTag
  });

export const tenantFeaturesKey = ({ env, tenantId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "tenant",
    type: "features",
    id: "_",
    clusterTenantTag
  });

export const usageMonthKey = ({ env, tenantId, yearMonth, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "tenant",
    type: "usage",
    id: yearMonth,
    clusterTenantTag
  });

/** Invite token lookup: {env}:t:{tenantId}:invite:{tokenId} */
export const inviteTokenKey = ({ env, tenantId, tokenId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "invite",
    type: "token",
    id: tokenId,
    clusterTenantTag
  });

export const jobProgressKey = ({ env, tenantId, jobId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "job",
    type: "progress",
    id: jobId,
    clusterTenantTag
  });

export const distributedLockKey = ({ env, tenantId, resource, id, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "lock",
    type: resource,
    id,
    clusterTenantTag
  });

export const idempotencyKey = ({ env, tenantId, provider, eventId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "idem",
    type: provider,
    id: eventId,
    clusterTenantTag
  });

export const dashWidgetKey = ({
  env,
  tenantId,
  roleId,
  widgetId,
  paramsHash = "_",
  clusterTenantTag = true
}) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "dash",
    type: "widget",
    id: [roleId, widgetId, paramsHash],
    clusterTenantTag
  });

export const dashUserKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "dash",
    type: "user",
    id: userId,
    clusterTenantTag
  });

export const reportSnapshotKey = ({
  env,
  tenantId,
  reportId,
  paramsHash = "_",
  clusterTenantTag = true
}) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "report",
    type: "snapshot",
    id: [reportId, paramsHash],
    clusterTenantTag
  });

export const notifUnreadKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "notif",
    type: "unread",
    id: userId,
    clusterTenantTag
  });

export const notifLatestKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "notif",
    type: "latest",
    id: userId,
    clusterTenantTag
  });

export const wsPresenceKey = ({ env, tenantId, userId, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "ws",
    type: "presence",
    id: userId,
    clusterTenantTag
  });

export const entityCacheKey = ({ env, tenantId, entity, id, clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "cache",
    type: entity,
    id,
    clusterTenantTag
  });

export const listCacheKey = ({ env, tenantId, entity, paramsHash = "_", clusterTenantTag = true }) =>
  buildKey({
    env,
    scope: "t",
    tenantId,
    module: "cache",
    type: "list",
    id: [entity, paramsHash],
    clusterTenantTag
  });

export const pubsubChannels = Object.freeze({
  cacheInvalidate: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "cache.invalidate", clusterTenantTag }),
  notifPush: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "notif.push", clusterTenantTag }),
  /** {env}:pubsub:t:{tenantId}:audit.created */
  auditCreated: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "audit.created", clusterTenantTag }),
  /** Pattern: {env}:pubsub:t:*:audit.created (subscribe to all tenants) */
  auditCreatedPattern: ({ env }) => {
    const effectiveEnv = normalizeEnv(env);
    return `${effectiveEnv}:pubsub:t:*:audit.created`;
  },
  /** {env}:pubsub:t:{tenantId}:notification.created */
  notificationCreated: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "notification.created", clusterTenantTag }),
  /** Pattern: {env}:pubsub:t:*:notification.created */
  notificationCreatedPattern: ({ env }) => {
    const effectiveEnv = normalizeEnv(env);
    return `${effectiveEnv}:pubsub:t:*:notification.created`;
  },
  wsBroadcast: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "ws.broadcast", clusterTenantTag }),
  wsBroadcastPattern: ({ env }) => {
    const effectiveEnv = normalizeEnv(env);
    return `${effectiveEnv}:pubsub:t:*:ws.broadcast`;
  },
  rbacChanged: ({ env, tenantId, clusterTenantTag = true }) =>
    buildChannel({ env, scope: "t", tenantId, topic: "rbac.changed", clusterTenantTag }),
  globalSystemAlerts: ({ env }) =>
    buildChannel({ env, scope: "global", topic: "system.alerts", clusterTenantTag: false })
});

export const cacheKeys = Object.freeze({
  normalizeEnv,
  buildKey,
  otpKey,
  otpAttemptsKey,
  otpLockKey,
  refreshKey,
  userRefreshSetKey,
  blacklistJtiKey,
  authSessionKey,
  passwordResetKey,
  globalRateIpKey,
  tenantRateUserLoginKey,
  tenantRateOtpSendKey,
  authDeviceKey,
  permSetKey,
  permHashKey,
  roleCacheKey,
  navTreeKey,
  tenantConfigKey,
  tenantFeaturesKey,
  usageMonthKey,
  inviteTokenKey,
  jobProgressKey,
  distributedLockKey,
  idempotencyKey,
  dashWidgetKey,
  dashUserKey,
  reportSnapshotKey,
  notifUnreadKey,
  notifLatestKey,
  wsPresenceKey,
  entityCacheKey,
  listCacheKey,
  pubsubChannels,
  tenantConfig: (tenantId, env = "dev") => tenantConfigKey({ env, tenantId }),
  userSession: (tenantId, userId, env = "dev") => authSessionKey({ env, tenantId, sessionId: userId })
});
