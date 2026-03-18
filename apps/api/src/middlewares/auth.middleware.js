import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { getAccessTokenFromCookies } from "#api/modules/auth/auth.cookies.js";
import { verifyAccessToken } from "#api/modules/auth/auth.tokens.js";


export const authenticate = () => {
  return async (req, _res, next) => {
    try {
      // 1️⃣ Extract access token ONLY from cookies
      const accessToken = req.cookies?.access_token;

     
      if (!accessToken) {
        return next(new ApiError(401, "Unauthorized"));
      }
      

      // 2️⃣ Verify JWT
      let payload;
      try {
        payload = verifyAccessToken(accessToken);
      } catch (err) {
        // Invalid / expired / tampered token
        return next(new ApiError(401, "Unauthorized"));
      }
 
      const { sub,   sid } = payload;

      if (!sub || !sid) {
        return next(new ApiError(401, "Unauthorized"));
      }

      // 3️⃣ Attach user context to request
      req.user = {
        id: sub,
        sid:sid
      };

      return next();
    } catch (error) {
      logger.warn({ err: error }, "Authentication failed");
      return next(new ApiError(401, "Unauthorized"));
    }
  };
};