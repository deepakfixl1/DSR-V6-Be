/**
 * Wraps async express handlers and forwards rejected promises to next().
 * @param {import("express").RequestHandler} handler
 * @returns {import("express").RequestHandler}
 */
export const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
