import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as automationService from "./automation.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
});

export const createRule = asyncHandler(async (req, res) => {
  const rule = await automationService.createRule({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.validated.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: rule });
});

export const listRules = asyncHandler(async (req, res) => {
  const result = await automationService.listRules({
    tenantId: req.tenant.id,
    query: req.validated?.query ?? {},
  });
  return res.status(200).json(result);
});

export const getRule = asyncHandler(async (req, res) => {
  const rule = await automationService.getRule({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
  });
  return res.status(200).json({ data: rule });
});

export const updateRule = asyncHandler(async (req, res) => {
  const rule = await automationService.updateRule({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    payload: req.validated.body,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: rule });
});

export const deleteRule = asyncHandler(async (req, res) => {
  const result = await automationService.deleteRule({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: result });
});

export const toggleRule = asyncHandler(async (req, res) => {
  const rule = await automationService.toggleRule({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: rule });
});

export const runRule = asyncHandler(async (req, res) => {
  const result = await automationService.runRule({
    tenantId: req.tenant.id,
    id: req.validated.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: result });
});

export const listLogs = asyncHandler(async (req, res) => {
  const result = await automationService.listLogs({
    tenantId: req.tenant.id,
    ruleId: req.validated.params.id,
    page: req.validated?.query?.page,
    limit: req.validated?.query?.limit,
  });
  return res.status(200).json(result);
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await automationService.getStats({
    tenantId: req.tenant.id,
  });
  return res.status(200).json({ data: stats });
});
