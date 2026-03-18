/**
 * Audit controller. Admin read-only; no business logic, delegates to service.
 */

import * as auditService from "#api/modules/audit/audit.service.js";

/**
 * GET /audit - list audit logs (admin, tenant-scoped).
 */
export async function list(req, res, next) {
  try {
    const { tenantId: queryTenantId, page, limit, entityType, entityId, actorId, action, from } = req.validated?.query ?? {};
    const result = await auditService.list({
      tenantId: req.tenantId ?? queryTenantId ?? null,
      page,
      limit,
      entityType,
      entityId,
      actorId,
      action,
      from: from ?? null,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /audit/:id - get single audit log (admin, tenant-scoped).
 */
export async function getById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { tenantId } = req.validated?.query ?? {};
    const doc = await auditService.getById(id, tenantId ?? null);
    if (!doc) return res.status(404).json({ message: "Audit log not found" });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
}
