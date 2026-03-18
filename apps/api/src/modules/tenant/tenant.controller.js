/**
 * Tenant controller. No business logic; extracts req data, calls service, returns response.
 */

import * as tenantService from "#api/modules/tenant/tenant.service.js";
import { TenantFeature, Tenant, PlanCatalog } from "#db/models/index.js";

/**
 * POST /tenants - create tenant invite (sends invite to owner; tenant created when owner accepts).
 */
export async function createTenant(req, res, next) {
  try {
    const { body } = req.validated;
    const result = await tenantService.createTenant(body, req.user.id, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /tenants/invites/:inviteId/reinvite - resend tenant owner invite (platform admin).
 */
export async function reinviteTenantInvite(req, res, next) {
  try {
    const { inviteId } = req.validated.params;
    const result = await tenantService.reinviteTenantInvite(inviteId, req.user.id, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
export const trackUsage =  async(req, res,next) => {
  try {
    
 
  const { tenantId } = req.params;
  const { field, value } = req.body;

  const usage = await tenantService.incrementUsage(
    tenantId,
    field,
    value ?? 1
  );

  res.status(200).json({
    success: true,
    data: usage,
  });
   } catch (error) {
     return next(error);
  }
};

/**
 * GET /tenants/:tenantId - get tenant details (membership required).
 */
export async function getTenant(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const tenant = await tenantService.getTenant(tenantId, req.user.id);
    return res.status(200).json(tenant);
  } catch (error) {
    return next(error);
  }
}

// tenant.controller.js
export async function getMyTenants(req, res, next) {
  try {
    const userId = req.user.id;
    const { search, status, page = 1, limit = 20 } = req.query || {};

    const result = await tenantService.getUserTenants(userId, {
      search: search || undefined,
      status: status && status !== "all" ? status : undefined,
      page: Number(page) || 1,
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
    });

    return res.status(200).json({
      success: true,
      count: result.data.length,
      total: result.total,
      data: result.data,
      statusCounts: result.statusCounts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /tenants/:tenantId - update tenant (owner only).
 */
export async function updateTenant(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { body } = req.validated;
    const tenant = await tenantService.updateTenant(tenantId, req.user.id, body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(tenant);
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /tenants/:tenantId - soft suspend tenant (owner only).
 */
export async function deleteTenant(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const tenant = await tenantService.suspendTenant(tenantId, req.user.id, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(tenant);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /tenants/:tenantId/settings - get structured settings.
 */
export async function getSettings(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const settings = await tenantService.getSettings(tenantId, req.user.id);
    return res.status(200).json(settings);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /tenants/:tenantId/settings - update settings (owner only).
 */
export async function updateSettings(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const { body } = req.validated;
    const settings = await tenantService.updateSettings(tenantId, req.user.id, body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json(settings);
  } catch (error) {
    return next(error);
  }
}

export async function getGeneralSettings(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await tenantService.getSettingsSection(tenantId, req.user.id, "branding");
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function updateReportConfig(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await tenantService.updateSettingsSection(
      tenantId,
      req.user.id,
      "security",
      { reportConfig: req.validated.body },
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateAiConfig(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await tenantService.updateSettingsSection(
      tenantId,
      req.user.id,
      "security",
      { aiConfig: req.validated.body },
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function getNotificationConfig(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await tenantService.getSettingsSection(tenantId, req.user.id, "notifications");
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function updateLateSubmissionLock(req, res, next) {
  try {
    const { tenantId } = req.validated.params;
    const data = await tenantService.updateSettingsSection(
      tenantId,
      req.user.id,
      "security",
      { lateSubmissionLock: req.validated.body },
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /tenants/:tenantId/features — returns enabled feature keys.
 * Merges PlanCatalog.features (plan-level) with TenantFeature overrides (tenant-level).
 */
export async function getFeatures(req, res, next) {
  try {
    const { tenantId } = req.validated?.params ?? req.params;

    // 1. Fetch tenant-level feature overrides
    const tenantFeatures = await TenantFeature.find({
      tenantId,
      enabled: true,
    }).lean();

    // 2. Fetch plan-level features from tenant's assigned plan
    let planFeatureKeys = [];
    try {
      const tenant = await Tenant.findById(tenantId).lean();
      if (tenant?.planId) {
        const plan = await PlanCatalog.findById(tenant.planId).lean();
        if (plan?.features && typeof plan.features === "object") {
          planFeatureKeys = Object.entries(plan.features)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
        }
      }
    } catch {
      // Plan lookup is best-effort; don't fail the request
    }

    // 3. Merge: tenant overrides take precedence, plan features fill gaps
    const tenantKeys = tenantFeatures.map((f) => f.featureKey);
    const allEnabled = [...new Set([...tenantKeys, ...planFeatureKeys])];

    // Return in the format the frontend expects: array of { featureKey, enabled }
    const data = allEnabled.map((key) => ({ featureKey: key, enabled: true }));
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}
