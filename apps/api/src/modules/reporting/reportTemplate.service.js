import mongoose from "mongoose";
import { ReportTemplate } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";
import { logger } from "#api/utils/logger.js";
import { log as auditLog } from "#api/modules/audit/audit.service.js";

/**
 * Create a new report template
 */
export async function createTemplate({ tenantId, userId, data, ip, userAgent }) {
  const existing = await ReportTemplate.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    code: data.code
  }).lean();

  if (existing) {
    throw ApiError.conflict("Template code already exists in this tenant");
  }

  const template = await ReportTemplate.create({
    ...data,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    createdBy: new mongoose.Types.ObjectId(userId)
  });

  await auditLog({
    action: "REPORT_TEMPLATE_CREATED",
    resourceType: "ReportTemplate",
    resourceId: template._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: { code: template.code, name: template.name }
  });

  logger.info({
    tenantId,
    userId,
    templateId: template._id,
    code: template.code
  }, "Report template created");

  return template;
}

/**
 * Update an existing report template
 */
export async function updateTemplate({ tenantId, userId, templateId, data, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!template) {
    throw ApiError.notFound("Template not found");
  }

  const oldData = template.toObject();

  Object.assign(template, data, {
    updatedBy: new mongoose.Types.ObjectId(userId)
  });

  await template.save();

  await auditLog({
    action: "REPORT_TEMPLATE_UPDATED",
    resourceType: "ReportTemplate",
    resourceId: template._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    diff: { before: oldData, after: template.toObject() },
    ip,
    userAgent,
    metadata: { code: template.code }
  });

  logger.info({
    tenantId,
    userId,
    templateId: template._id
  }, "Report template updated");

  return template;
}

/**
 * Get template by ID
 */
export async function getTemplateById({ tenantId, templateId }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();

  if (!template) {
    throw ApiError.notFound("Template not found");
  }

  return template;
}

/**
 * List templates with pagination and filters
 */
export async function listTemplates({ tenantId, page = 1, limit = 20, reportType, status, search }) {
  const filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };

  if (reportType) filter.reportType = reportType;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ReportTemplate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReportTemplate.countDocuments(filter)
  ]);

  return {
    docs,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Delete a template
 */
export async function deleteTemplate({ tenantId, userId, templateId, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!template) {
    throw ApiError.notFound("Template not found");
  }

  await template.deleteOne();

  await auditLog({
    action: "REPORT_TEMPLATE_DELETED",
    resourceType: "ReportTemplate",
    resourceId: template._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: { code: template.code, name: template.name }
  });

  logger.info({
    tenantId,
    userId,
    templateId: template._id
  }, "Report template deleted");

  return { success: true };
}

/**
 * Update template status
 */
export async function updateTemplateStatus({ tenantId, userId, templateId, status, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  });

  if (!template) {
    throw ApiError.notFound("Template not found");
  }

  const oldStatus = template.status;
  template.status = status;
  template.updatedBy = new mongoose.Types.ObjectId(userId);
  await template.save();

  await auditLog({
    action: "REPORT_TEMPLATE_UPDATED",
    resourceType: "ReportTemplate",
    resourceId: template._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    diff: { before: { status: oldStatus }, after: { status } },
    ip,
    userAgent,
    metadata: { code: template.code, statusChange: `${oldStatus} -> ${status}` }
  });

  logger.info({
    tenantId,
    userId,
    templateId: template._id,
    oldStatus,
    newStatus: status
  }, "Report template status updated");

  return template;
}

/**
 * Clone a template
 */
export async function cloneTemplate({ tenantId, userId, templateId, ip, userAgent }) {
  const template = await ReportTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();

  if (!template) {
    throw ApiError.notFound("Template not found");
  }

  const cloneData = {
    ...template,
    _id: undefined,
    code: `${template.code}_COPY_${Date.now()}`,
    name: `${template.name} (Copy)`,
    status: "disabled",
    createdBy: new mongoose.Types.ObjectId(userId),
    updatedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined
  };

  const cloned = await ReportTemplate.create(cloneData);

  await auditLog({
    action: "REPORT_TEMPLATE_CREATED",
    resourceType: "ReportTemplate",
    resourceId: cloned._id,
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    ip,
    userAgent,
    metadata: { code: cloned.code, clonedFrom: template._id }
  });

  logger.info({
    tenantId,
    userId,
    templateId: cloned._id,
    sourceTemplateId: templateId
  }, "Report template cloned");

  return cloned;
}
