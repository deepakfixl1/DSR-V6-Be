/**
 * Basic input sanitization to prevent MongoDB operator injection.
 * Removes keys that start with "$" or contain "." from req.body/query/params.
 */

const sanitizeObject = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeObject);
  const clean = {};
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = sanitizeObject(val);
  }
  return clean;
};

export const sanitizeInput = () => (req, _res, next) => {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  return next();
};
