import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as service from "./weekCycle.service.js";

const meta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
  method: req.method,
  path: req.originalUrl,
  requestId: req.id ?? null,
});

export const createWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.createWeekCycle({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(201).json({ data });
});

export const listWeekCycles = asyncHandler(async (req, res) => {
  const data = await service.listWeekCycles({
    tenantId: req.tenant.id,
    query: req.query,
  });
  res.status(200).json(data);
});

export const getWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.getWeekCycleById({
    tenantId: req.tenant.id,
    id: req.params.id,
  });
  res.status(200).json({ data });
});

export const updateWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.updateWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const deleteWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.deleteWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const submitWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.submitWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const reviewWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.reviewWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const approveWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.approveWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const rejectWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.rejectWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: meta(req),
  });
  res.status(200).json({ data });
});

export const unlockWeekCycle = asyncHandler(async (req, res) => {
  const data = await service.unlockWeekCycle({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: { ip: req.ip, method: req.method, path: req.originalUrl },
  });
  res.status(200).json({ data });
});