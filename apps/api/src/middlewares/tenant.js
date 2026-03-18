import { ApiError } from "#api/utils/ApiError.js";
import { isValidObjectId } from "#api/utils/validateObjectId.js";

const resolveTenantId = (req) =>
  req.tenant?.id ??
  req.user?.tenantId ??
  req.headers["x-tenant-id"] ??
  req.query?.tenantId ??
  req.body?.tenantId ??
  null;

/**
 * Tenant resolver middleware. Attaches req.tenant and req.tenantId.
 */
export const resolveTenant = () => {
  return (req, _res, next) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId || !isValidObjectId(tenantId)) {
      return next(ApiError.badRequest("Valid tenantId is required"));
    }
    req.tenant = { id: String(tenantId) };
    req.tenantId = String(tenantId);
    return next();
  };
};
