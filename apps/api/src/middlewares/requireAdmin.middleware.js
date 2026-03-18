/**
 * Requires authenticated user with platform admin role.
 */

import { User } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";

/**
 * @returns {import("express").RequestHandler}
 */
export const requireAdmin = () => {
  return async (req, _res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next(ApiError.unauthorized("Unauthorized"));

      const user = await User.findById(userId).select("isPlatformAdmin").lean();
      if (!user?.isPlatformAdmin) {
        return next(ApiError.forbidden("Admin access required"));
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
