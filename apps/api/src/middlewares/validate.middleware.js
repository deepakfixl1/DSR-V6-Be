import { ZodError } from "zod";
import { ApiError } from "#api/utils/ApiError.js";

/**
 * Validation middleware.
 * Supports two schema formats:
 *   1. Zod schema: z.object({ body, query, params }) — calls schema.parseAsync(...)
 *   2. Plain object: { body: z.object(...), query: z.object(...) } — validates each key separately
 */
export const validate = (schema) => async (req, _res, next) => {
  try {
    // Strip fields injected by the frontend API client that don't belong in the
    // validated body (tenantId is already resolved by resolveTenant middleware via
    // the x-tenant-id header; keeping it in the body breaks .strict() schemas).
    const INJECTED_FIELDS = ["tenantId"];
    const cleanBody = req.body && typeof req.body === "object"
      ? Object.fromEntries(Object.entries(req.body).filter(([k]) => !INJECTED_FIELDS.includes(k)))
      : req.body;

    if (typeof schema?.parseAsync === "function") {
      // Format 1: full Zod schema
      req.validated = await schema.parseAsync({
        body: cleanBody,
        query: req.query,
        params: req.params,
      });
    } else {
      // Format 2: plain object with individual Zod schemas per key
      const validated = {};
      if (schema?.body) validated.body = await schema.body.parseAsync(cleanBody);
      if (schema?.query) validated.query = await schema.query.parseAsync(req.query);
      if (schema?.params) validated.params = await schema.params.parseAsync(req.params);
      req.validated = validated;
    }
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(ApiError.badRequest("Validation failed", error.flatten()));
    }
    return next(error);
  }
};
