const SENSITIVE_KEYWORDS = [
  "token",
  "secret",
  "password",
  "credential",
  "clientsecret"
];

const isSensitiveKey = (key) => {
  if (!key) return false;
  const normalized = String(key).toLowerCase();
  if (normalized === "oauth") return true;
  return SENSITIVE_KEYWORDS.some((word) => normalized.includes(word));
};

const sanitizeObject = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (!value || typeof value !== "object") return value;
  const sanitized = {};
  for (const [key, val] of Object.entries(value)) {
    if (isSensitiveKey(key)) continue;
    sanitized[key] = sanitizeObject(val);
  }
  return sanitized;
};

export const sanitizeIntegration = (integration) => {
  const data = integration?.toJSON ? integration.toJSON() : { ...(integration || {}) };
  return {
    ...data,
    config: sanitizeObject(data.config || {})
  };
};

export const sanitizeError = (error) => {
  const payload = {
    name: error?.name || "Error",
    message: error?.message || "Unknown error",
    statusCode: error?.statusCode || error?.status || null
  };
  if (error?.details) {
    payload.details = sanitizeObject(error.details);
  }
  return payload;
};

export const normalizeTrackedBranches = (branches) => {
  if (!Array.isArray(branches)) return [];
  const normalized = branches
    .map((b) => String(b).trim())
    .filter((b) => b.length > 0);
  return Array.from(new Set(normalized));
};
