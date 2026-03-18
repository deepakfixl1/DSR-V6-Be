import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as service from "./apiKey.service.js";

const meta = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });

export const listApiKeys = asyncHandler(async (req, res) => {
  const data = await service.listApiKeys({ tenantId: req.validated.query.tenantId, actorId: req.user.id });
  res.status(200).json({ data });
});

export const createApiKey = asyncHandler(async (req, res) => {
  const data = await service.createApiKey({ tenantId: req.validated.body.tenantId, actorId: req.user.id, payload: req.validated.body, meta: meta(req) });
  res.status(201).json({ data });
});

export const updateApiKey = asyncHandler(async (req, res) => {
  const data = await service.updateApiKey({ tenantId: req.validated.query.tenantId, actorId: req.user.id, id: req.validated.params.id, payload: req.validated.body, meta: meta(req) });
  res.status(200).json({ data });
});

export const deleteApiKey = asyncHandler(async (req, res) => {
  const data = await service.deleteApiKey({ tenantId: req.validated.query.tenantId, actorId: req.user.id, id: req.validated.params.id, meta: meta(req) });
  res.status(200).json({ data });
});
