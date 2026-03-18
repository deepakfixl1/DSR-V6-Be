import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import * as templateService from "./template.service.js";

const buildMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] ?? null,
  method: req.method,
  path: req.originalUrl,
  requestId: req.id ?? null,
});

export const createTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.createTemplate({
    tenantId: req.tenant.id,
    actorId: req.user.id,
    payload: req.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: template });
});

export const listTemplates = asyncHandler(async (req, res) => {
  const result = await templateService.listTemplates({
    tenantId: req.tenant.id,
    query: req.query,
  });
  return res.status(200).json(result);
});

export const getTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplateById({
    tenantId: req.tenant.id,
    id: req.params.id,
    includeArchived: req.query?.includeArchived ?? false,
  });
  return res.status(200).json({ data: template });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate({
    tenantId: req.tenant.id,
    id: req.params.id,
    payload: req.body,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const disableTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.disableTemplate({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const enableTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.enableTemplate({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const archiveTemplate = asyncHandler(async (req, res) => {
  const result = await templateService.archiveTemplate({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: result });
});

export const restoreArchivedTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.restoreArchivedTemplate({
    tenantId: req.tenant.id,
    id: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const cloneTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.cloneTemplate({
    tenantId: req.tenant.id,
    templateId: req.params.id,
    actorId: req.user.id,
    overrides: req.body ?? {},
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: template });
});

export const setDefaultTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.setDefaultTemplate({
    tenantId: req.tenant.id,
    templateId: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const getDefaultTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.getDefaultTemplate({
    tenantId: req.tenant.id,
    departmentType: req.query.departmentType,
    reportType: req.query.reportType,
    templateScope: req.query.templateScope,
  });
  return res.status(200).json({ data: template });
});

export const resolveTemplateForDepartment = asyncHandler(async (req, res) => {
  const template = await templateService.resolveTemplateForDepartment({
    tenantId: req.tenant.id,
    departmentId: req.params.departmentId,
    reportType: req.params.reportType,
  });
  return res.status(200).json({ data: template });
});

export const listSystemTemplates = asyncHandler(async (req, res) => {
  const result = await templateService.listSystemTemplates({
    query: req.query,
  });
  return res.status(200).json(result);
});

export const createSystemTemplate = asyncHandler(async (req, res) => {

  const template = await templateService.createSystemTemplate({
    actorId: req.user.id,
    payload: req.body,
    meta: buildMeta(req),
  });
  return res.status(201).json({ data: template });
});

export const updateSystemTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.updateSystemTemplate({
    id: req.params.id,
    actorId: req.user.id,
    payload: req.body,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: template });
});

export const deleteSystemTemplate = asyncHandler(async (req, res) => {
  const result = await templateService.deleteSystemTemplate({
    id: req.params.id,
    actorId: req.user.id,
    meta: buildMeta(req),
  });
  return res.status(200).json({ data: result });
});