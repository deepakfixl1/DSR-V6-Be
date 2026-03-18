import { ZodError } from "zod";
import { ApiError } from "#api/utils/ApiError.js";
import { config } from "#api/config/env.js";
import { logger } from "#api/utils/logger.js";

export const errorMiddleware = (error, req, res, _next) => {
  const requestId = req.id ?? req.headers["x-request-id"];

  if (error instanceof ZodError) {
    const payload = {
      message: "Validation failed",
      details: error.flatten()
    };
    logger.warn({ err: error, requestId }, payload.message);
    return res.status(400).json(payload);
  }

  if (error instanceof ApiError) {
    const payload = {
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    };
    logger.warn({ err: error, requestId, statusCode: error.statusCode }, "Handled API error");
    return res.status(error.statusCode).json(payload);
  }

  logger.error({ err: error, requestId }, "Unhandled error");
  return res.status(500).json({
    message: "Internal server error",
    ...(config.app.isProduction ? {} : { stack: error.stack })
  });
};
