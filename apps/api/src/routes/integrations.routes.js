import { Router } from "express";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { resolveTenant } from "#api/middlewares/tenant.js";
import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { ApiError } from "#api/utils/ApiError.js";
import { sanitizeIntegration } from "#api/utils/integration.utils.js";
import { Integration, IntegrationCredential } from "#db/models/index.js";

const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_CONFIG_FIELDS_BY_TYPE = {
  github: ["displayName", "syncMode", "repoSelectionMode"]
};

const ensureIntegrationByType = async ({ tenantId, type }) => {
  const integration = await Integration.findOne({ tenantId, type });
  if (!integration) {
    throw ApiError.notFound("Integration not found");
  }
  return integration;
};

const buildSafeIntegrationResponse = (integration) => {
  const sanitized = sanitizeIntegration(integration);
  return {
    id: sanitized.id || sanitized._id,
    type: sanitized.type,
    name: sanitized.name,
    status: sanitized.status,
    config: sanitized.config,
    lastSyncAt: sanitized.lastSyncAt,
    createdAt: sanitized.createdAt,
    updatedAt: sanitized.updatedAt
  };
};

export const createIntegrationsRoutes = () => {
  const router = Router();

  router.use(authenticate());
  router.use(resolveTenant());

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const integrations = await Integration.find({ tenantId: req.tenantId }).sort({ name: 1 });
      const items = integrations.map(buildSafeIntegrationResponse);
      res.json({ data: items });
    })
  );

  router.get(
    "/:type",
    asyncHandler(async (req, res) => {
      const integration = await ensureIntegrationByType({
        tenantId: req.tenantId,
        type: req.params.type
      });
      res.json({ data: buildSafeIntegrationResponse(integration) });
    })
  );

  router.patch(
    "/:type",
    asyncHandler(async (req, res) => {
      const integration = await ensureIntegrationByType({
        tenantId: req.tenantId,
        type: req.params.type
      });

      const updates = {};
      if (req.body.status !== undefined) {
        if (!ALLOWED_STATUS.has(req.body.status)) {
          throw ApiError.badRequest("Invalid status update");
        }
        updates.status = req.body.status;
      }

      if (req.body.metadata !== undefined) {
        if (!req.body.metadata || typeof req.body.metadata !== "object") {
          throw ApiError.badRequest("metadata must be an object");
        }
        updates.metadata = req.body.metadata;
      }

      if (req.body.config !== undefined) {
        const config = req.body.config;
        if (!config || typeof config !== "object") {
          throw ApiError.badRequest("config must be an object");
        }
        const configKeys = Object.keys(config);
        if (configKeys.some((key) => key !== "safe")) {
          throw ApiError.badRequest("Only config.safe updates are allowed");
        }
        const safe = config.safe || {};
        if (safe && typeof safe !== "object") {
          throw ApiError.badRequest("config.safe must be an object");
        }
        const allowedKeys = ALLOWED_CONFIG_FIELDS_BY_TYPE[integration.type] || [];
        const safeKeys = Object.keys(safe || {});
        const invalidKeys = safeKeys.filter((key) => !allowedKeys.includes(key));
        if (invalidKeys.length) {
          throw ApiError.badRequest("config.safe contains unsupported keys", { invalidKeys });
        }
        if (safeKeys.length) {
          updates.config = {
            ...(integration.config || {}),
            safe: {
              ...(integration.config?.safe || {}),
              ...safe
            }
          };
        }
      }

      if (!Object.keys(updates).length) {
        throw ApiError.badRequest("No valid fields to update");
      }

      Object.assign(integration, updates);
      await integration.save();

      res.json({ data: buildSafeIntegrationResponse(integration) });
    })
  );

  router.get(
    "/:type/credentials",
    asyncHandler(async (req, res) => {
      const integration = await ensureIntegrationByType({
        tenantId: req.tenantId,
        type: req.params.type
      });
      const credentials = await IntegrationCredential.find({
        tenantId: req.tenantId,
        integrationId: integration._id
      }).sort({ kind: 1 });

      const items = credentials.map((credential) => ({
        kind: credential.kind,
        expiresAt: credential.expiresAt,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      }));

      res.json({ data: items });
    })
  );

  router.delete(
    "/:type/credentials/:kind",
    asyncHandler(async (req, res) => {
      const integration = await ensureIntegrationByType({
        tenantId: req.tenantId,
        type: req.params.type
      });
      await IntegrationCredential.deleteOne({
        tenantId: req.tenantId,
        integrationId: integration._id,
        kind: req.params.kind
      });

      integration.status = "inactive";
      const nextConfig = { ...(integration.config || {}) };
      delete nextConfig.github;
      delete nextConfig.oauth;
      integration.config = nextConfig;
      await integration.save();

      res.json({ message: "Credential deleted" });
    })
  );

  return router;
};
