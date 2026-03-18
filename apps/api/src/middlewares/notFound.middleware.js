import { ApiError } from "#api/utils/ApiError.js";

export const notFoundMiddleware = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
