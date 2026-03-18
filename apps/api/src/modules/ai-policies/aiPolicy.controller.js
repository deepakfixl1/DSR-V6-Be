import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as service from "./aiPolicy.service.js";

const meta = (req) => ({ ip: req.ip, userAgent: req.headers["user-agent"] ?? null });

export const createPolicy = asyncHandler(async (req, res) => {
  const policy = await service.createPolicy({
    tenantId: req.tenant.id, actorId: req.user.id,
    payload: req.validated.body, meta: meta(req),
  });
  return res.status(201).json({ data: policy });
});

export const listPolicies = asyncHandler(async (req, res) => {
  const result = await service.listPolicies({
    tenantId: req.tenant.id, query: req.validated?.query ?? {},
  });
  return res.status(200).json(result);
});

export const getPolicy = asyncHandler(async (req, res) => {
  const policy = await service.getPolicy({
    tenantId: req.tenant.id, id: req.validated.params.id,
  });
  return res.status(200).json({ data: policy });
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const policy = await service.updatePolicy({
    tenantId: req.tenant.id, id: req.validated.params.id,
    payload: req.validated.body, actorId: req.user.id, meta: meta(req),
  });
  return res.status(200).json({ data: policy });
});

export const deletePolicy = asyncHandler(async (req, res) => {
  const result = await service.deletePolicy({
    tenantId: req.tenant.id, id: req.validated.params.id,
    actorId: req.user.id, meta: meta(req),
  });
  return res.status(200).json({ data: result });
});

export const togglePolicy = asyncHandler(async (req, res) => {
  const policy = await service.togglePolicy({
    tenantId: req.tenant.id, id: req.validated.params.id,
    actorId: req.user.id, meta: meta(req),
  });
  return res.status(200).json({ data: policy });
});
