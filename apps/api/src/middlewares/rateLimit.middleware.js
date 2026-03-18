import rateLimit from "express-rate-limit";

export const createRateLimiter = () => {
  if (process.env.NODE_ENV === "development") {
    // No rate limiting in development
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  });
};

export const createSensitiveRateLimiter = ({ windowMs = 15 * 60 * 1000, limit = 60 } = {}) => {
  if (process.env.NODE_ENV === "development") {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests for this endpoint, please try again later." },
  });
};
