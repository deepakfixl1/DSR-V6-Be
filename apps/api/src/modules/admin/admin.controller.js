/**
 * Admin controller. Platform metrics; delegates to service.
 */

import * as adminService from "#api/modules/admin/admin.service.js";

/**
 * GET /admin/metrics - platform-wide metrics (admin only).
 */
export async function getMetrics(req, res, next) {
  try {
    const metrics = await adminService.getMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    return next(error);
  }
}

export async function listTenants(req, res, next) {
  try {
    const data = await adminService.listTenants();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function suspendTenant(req, res, next) {
  try {
    const data = await adminService.suspendTenantByAdmin(req.validated.params.id, req.user.id);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function unsuspendTenant(req, res, next) {
  try {
    const data = await adminService.unsuspendTenantByAdmin(req.validated.params.id, req.user.id);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function impersonateTenant(req, res, next) {
  try {
    const data = await adminService.impersonateTenant(req.validated.params.id, req.user.id);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getPlatformStats(req, res, next) {
  try {
    const data = await adminService.getPlatformStats();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function createBreakGlass(req, res, next) {
  try {
    const data = await adminService.createBreakGlassAccess({ actorId: req.user.id, reason: req.validated.body.reason });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getBreakGlassLog(req, res, next) {
  try {
    const data = await adminService.getBreakGlassLog();
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}
