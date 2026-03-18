import mongoose from "mongoose";
import ReportTemplate from "#db/models/ReportTemplate.model.js";
import Department from "#db/models/Department.model.js";
import { ApiError } from "#api/utils/ApiError.js";
import { recordAudit } from "#api/modules/audit/audit.service.js";


import { logger } from "#api/utils/logger.js";
import { createNotification } from "#api/modules/notification/notification.service.js";

const TEMPLATE_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled",
  ARCHIVED: "archived",
};

const TEMPLATE_SCOPE = {
  SYSTEM: "system",
  TENANT: "tenant",
};

const DEPARTMENT_SCOPE = {
  ALL: "ALL",
  SELECTED: "SELECTED",
};

const DEPARTMENT_TYPES = new Set([
  "SALES",
  "IT",
  "ENGINEERING",
  "HR",
  "FINANCE",
  "OPERATIONS",
  "CUSTOM",
]);

const REPORT_TYPES = new Set([
  "DSR",
  "WSR",
  "MSR",
  "QBR",
  "YBR",
  "CUSTOM",
]);

const PERIOD_MODES = new Set([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
]);

const DATE_RANGE_RULES = new Set([
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "LAST_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "THIS_QUARTER",
  "LAST_QUARTER",
  "THIS_YEAR",
  "LAST_YEAR",
  "CUSTOM",
]);

const VIEW_TYPES = new Set(["TABLE", "CHART", "TEXT", "KPI", "LIST"]);
const CHART_TYPES = new Set(["bar", "line", "pie", "donut", "area", "stackedBar"]);
const OUTPUT_FORMATS = new Set(["PDF", "XLSX", "CSV", "JSON", "HTML"]);
const METRIC_AGGREGATIONS = new Set(["count", "sum", "avg", "min", "max", "distinctCount", "ratio"]);
const METRIC_FORMATS = new Set(["number", "currency", "percent", "duration", "text"]);
const COLUMN_TYPES = new Set(["text", "number", "currency", "percent", "date", "datetime", "badge"]);
const FILTER_OPERATORS = new Set(["eq", "ne", "in", "nin", "gt", "gte", "lt", "lte", "between", "regex", "exists"]);

const safeLogger = {
  info: (...args) => {
    try {
      if (logger?.info) logger.info(...args);
      else console.log(...args);
    } catch (_) {}
  },
  warn: (...args) => {
    try {
      if (logger?.warn) logger.warn(...args);
      else console.warn(...args);
    } catch (_) {}
  },
  error: (...args) => {
    try {
      if (logger?.error) logger.error(...args);
      else console.error(...args);
    } catch (_) {}
  },
};

const toObjectId = (value, fieldName = "id") => {
  if (value === null || value === undefined || value === "") return null;
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(String(value));
};

const toObjectIdArray = (values = [], fieldName = "ids") => {
  if (!Array.isArray(values)) {
    throw ApiError.badRequest(`${fieldName} must be an array`);
  }
  return values.map((value, index) => toObjectId(value, `${fieldName}[${index}]`));
};

const sanitizeString = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : "";
};

const sanitizeStringArray = (values = []) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => sanitizeString(item))
    .filter(Boolean);
};

const dedupeStrings = (values = []) => [...new Set(values)];

const now = () => new Date();

const buildAuditMeta = (meta = {}, extra = {}) => ({
  module: "report-template",
  timestamp: new Date().toISOString(),
  ...meta,
  ...extra,
});

const safeRecordAudit = async (payload) => {
  try {
    await recordAudit(payload);
  } catch (error) {
    safeLogger.error("report-template.audit_failed", {
      error: error.message,
      payload,
    });
  }
};

const safeSendNotification = async (payload) => {
  try {
    if (typeof createNotification === "function") {
      await createNotification(payload);
    }
  } catch (error) {
    safeLogger.error("report-template.notification_failed", {
      error: error.message,
      payload,
    });
  }
};

const safeSendEmail = async (payload) => {
  try {
    if (typeof sendEmail === "function") {
      await sendEmail(payload);
    }
  } catch (error) {
    safeLogger.error("report-template.email_failed", {
      error: error.message,
      payload,
    });
  }
};

const mapMongoError = (error) => {
  if (error?.code === 11000) {
    return ApiError.conflict("Duplicate template detected", {
      duplicateKey: error.keyValue,
    });
  }
  return error;
};

const serviceWrapper = async ({
  tenantId,
  actorId = null,
  entityType,
  entityId = null,
  action,
  meta = {},
  execute,
}) => {
  try {
    safeLogger.info(`report-template.${action}.started`, {
      tenantId,
      actorId,
      entityType,
      entityId,
      meta,
    });

    const result = await execute();

    safeLogger.info(`report-template.${action}.completed`, {
      tenantId,
      actorId,
      entityType,
      entityId,
    });

    return result;
  } catch (rawError) {
    const error = mapMongoError(rawError);

    safeLogger.error(`report-template.${action}.failed`, {
      tenantId,
      actorId,
      entityType,
      entityId,
      error: error.message,
      statusCode: error.statusCode ?? 500,
      details: error.details ?? null,
    });

    await safeRecordAudit({
      tenantId,
      actorId,
      entityType,
      entityId,
      action: `${action}_failed`,
      meta: buildAuditMeta(meta, {
        success: false,
        errorMessage: error.message,
        errorName: error.name,
        statusCode: error.statusCode ?? 500,
        details: error.details ?? null,
      }),
    });

    throw error;
  }
};

const validateMetric = (metric, sectionKey, index) => {
  if (!metric?.key) {
    throw ApiError.badRequest(`sections[${sectionKey}].metrics[${index}].key is required`);
  }
  if (!metric?.label) {
    throw ApiError.badRequest(`sections[${sectionKey}].metrics[${index}].label is required`);
  }
  if (!METRIC_AGGREGATIONS.has(metric.aggregation)) {
    throw ApiError.badRequest(`Invalid metric aggregation in section ${sectionKey}`);
  }
  if (metric.format && !METRIC_FORMATS.has(metric.format)) {
    throw ApiError.badRequest(`Invalid metric format in section ${sectionKey}`);
  }
};

const validateFilter = (filter, sectionKey, index) => {
  if (!filter?.field) {
    throw ApiError.badRequest(`sections[${sectionKey}].baseFilters[${index}].field is required`);
  }
  if (!FILTER_OPERATORS.has(filter.operator)) {
    throw ApiError.badRequest(`Invalid filter operator in section ${sectionKey}`);
  }
};

const validateColumn = (column, sectionKey, index) => {
  if (!column?.key) {
    throw ApiError.badRequest(`sections[${sectionKey}].columns[${index}].key is required`);
  }
  if (!column?.label) {
    throw ApiError.badRequest(`sections[${sectionKey}].columns[${index}].label is required`);
  }
  if (column.type && !COLUMN_TYPES.has(column.type)) {
    throw ApiError.badRequest(`Invalid column type in section ${sectionKey}`);
  }
};

const validateSection = (section, index) => {
  if (!section?.key) {
    throw ApiError.badRequest(`sections[${index}].key is required`);
  }

  if (!section?.title) {
    throw ApiError.badRequest(`sections[${index}].title is required`);
  }

  if (!section.source?.module) {
    throw ApiError.badRequest(`sections[${index}].source.module is required`);
  }

  if (!section.source?.entity) {
    throw ApiError.badRequest(`sections[${index}].source.entity is required`);
  }

  if (section.view?.type && !VIEW_TYPES.has(section.view.type)) {
    throw ApiError.badRequest(`Invalid view.type in section ${section.key}`);
  }

  if (section.view?.chart?.chartType && !CHART_TYPES.has(section.view.chart.chartType)) {
    throw ApiError.badRequest(`Invalid chartType in section ${section.key}`);
  }

  const filters = section.source?.baseFilters ?? [];
  filters.forEach((filter, i) => validateFilter(filter, section.key, i));

  const metrics = section.source?.metrics ?? [];
  metrics.forEach((metric, i) => validateMetric(metric, section.key, i));

  const columns = section.view?.columns ?? [];
  columns.forEach((column, i) => validateColumn(column, section.key, i));
};

const validateTemplateStructure = (payload) => {
  const sectionKeys = new Set();

  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    throw ApiError.badRequest("At least one section is required");
  }

  for (let i = 0; i < payload.sections.length; i += 1) {
    const section = payload.sections[i];
    validateSection(section, i);

    if (sectionKeys.has(section.key)) {
      throw ApiError.badRequest(`Duplicate section key detected: ${section.key}`);
    }
    sectionKeys.add(section.key);
  }
};

const validateBusinessRules = async ({ tenantId, payload, templateId = null, session = null }) => {
  if (!payload.name) throw ApiError.badRequest("name is required");
  if (!payload.code) throw ApiError.badRequest("code is required");
  if (!payload.templateScope) throw ApiError.badRequest("templateScope is required");
  if (!payload.departmentType) throw ApiError.badRequest("departmentType is required");
  if (!payload.reportType) throw ApiError.badRequest("reportType is required");
  if (!payload.generation?.periodMode) throw ApiError.badRequest("generation.periodMode is required");
  if (!payload.generation?.dateRangeRule) throw ApiError.badRequest("generation.dateRangeRule is required");

  if (!Object.values(TEMPLATE_SCOPE).includes(payload.templateScope)) {
    throw ApiError.badRequest("Invalid templateScope");
  }

  if (!DEPARTMENT_TYPES.has(payload.departmentType)) {
    throw ApiError.badRequest("Invalid departmentType");
  }

  if (!REPORT_TYPES.has(payload.reportType)) {
    throw ApiError.badRequest("Invalid reportType");
  }

  if (!PERIOD_MODES.has(payload.generation.periodMode)) {
    throw ApiError.badRequest("Invalid generation.periodMode");
  }

  if (!DATE_RANGE_RULES.has(payload.generation.dateRangeRule)) {
    throw ApiError.badRequest("Invalid generation.dateRangeRule");
  }

  if (payload.departmentScope && !Object.values(DEPARTMENT_SCOPE).includes(payload.departmentScope)) {
    throw ApiError.badRequest("Invalid departmentScope");
  }

  if (payload.templateScope === TEMPLATE_SCOPE.SYSTEM && payload.tenantId) {
    throw ApiError.badRequest("System template cannot have tenantId");
  }

  if (payload.templateScope === TEMPLATE_SCOPE.TENANT && !tenantId) {
    throw ApiError.badRequest("Tenant template requires tenantId");
  }

  if (
    payload.departmentScope === DEPARTMENT_SCOPE.SELECTED &&
    (!Array.isArray(payload.departmentIds) || payload.departmentIds.length === 0)
  ) {
    throw ApiError.badRequest("departmentIds are required when departmentScope is SELECTED");
  }

  if (payload.outputDefaults?.formats) {
    for (const format of payload.outputDefaults.formats) {
      if (!OUTPUT_FORMATS.has(format)) {
        throw ApiError.badRequest(`Invalid output format: ${format}`);
      }
    }
  }

  validateTemplateStructure(payload);

  const duplicateQuery = {
    tenantId: payload.templateScope === TEMPLATE_SCOPE.SYSTEM ? null : toObjectId(tenantId, "tenantId"),
    departmentType: payload.departmentType,
    reportType: payload.reportType,
    code: payload.code,
  };

  if (templateId) {
    duplicateQuery._id = { $ne: toObjectId(templateId, "templateId") };
  }

  const duplicate = await ReportTemplate.findOne(duplicateQuery).session(session).lean();
  if (duplicate) {
    throw ApiError.conflict("Template code already exists for this department/reportType");
  }

  if (payload.parentTemplateId) {
    const parent = await ReportTemplate.findById(
      toObjectId(payload.parentTemplateId, "parentTemplateId")
    )
      .session(session)
      .lean();

    if (!parent) {
      throw ApiError.badRequest("parentTemplateId references a non-existing template");
    }
  }

  if (payload.departmentIds?.length) {
    const ids = toObjectIdArray(payload.departmentIds, "departmentIds");
    const count = await Department.countDocuments({
      _id: { $in: ids },
      tenantId: toObjectId(tenantId, "tenantId"),
    }).session(session);

    if (count !== ids.length) {
      throw ApiError.badRequest("One or more departmentIds are invalid");
    }
  }
};

const normalizePayload = (payload = {}, tenantId = null) => {
  const templateScope = payload.templateScope ?? TEMPLATE_SCOPE.TENANT;

  return {
    tenantId: templateScope === TEMPLATE_SCOPE.SYSTEM ? null : toObjectId(tenantId, "tenantId"),
    templateScope,
    parentTemplateId: payload.parentTemplateId ? toObjectId(payload.parentTemplateId, "parentTemplateId") : null,
    code: sanitizeString(payload.code)?.toUpperCase(),
    name: sanitizeString(payload.name),
    description: sanitizeString(payload.description) ?? "",
    departmentType: payload.departmentType,
    reportType: payload.reportType,
    generation: {
      periodMode: payload.generation?.periodMode,
      dateRangeRule: payload.generation?.dateRangeRule,
      schedule: {
        cron: sanitizeString(payload.generation?.schedule?.cron),
        timezone: sanitizeString(payload.generation?.schedule?.timezone) || "Asia/Kolkata",
      },
    },
    departmentScope: payload.departmentScope ?? DEPARTMENT_SCOPE.ALL,
    departmentIds: toObjectIdArray(payload.departmentIds ?? [], "departmentIds"),
    teamIds: toObjectIdArray(payload.teamIds ?? [], "teamIds"),
    userIds: toObjectIdArray(payload.userIds ?? [], "userIds"),
    sections: Array.isArray(payload.sections) ? payload.sections : [],
    outputDefaults: {
      formats: dedupeStrings(payload.outputDefaults?.formats ?? ["PDF"]),
      timezone: sanitizeString(payload.outputDefaults?.timezone) || "Asia/Kolkata",
      locale: sanitizeString(payload.outputDefaults?.locale) || "en-IN",
      currency: sanitizeString(payload.outputDefaults?.currency) || "INR",
      includeBranding: payload.outputDefaults?.includeBranding ?? true,
    },
    access: {
      minPermission: sanitizeString(payload.access?.minPermission) || "reports.view",
      allowedRoleIds: toObjectIdArray(payload.access?.allowedRoleIds ?? [], "access.allowedRoleIds"),
      allowedUserIds: toObjectIdArray(payload.access?.allowedUserIds ?? [], "access.allowedUserIds"),
    },
    isDefault: payload.isDefault ?? false,
    isSystemLocked: payload.isSystemLocked ?? false,
    version: Number(payload.version ?? 1),
    tags: dedupeStrings(sanitizeStringArray(payload.tags ?? [])),
    status: payload.status ?? TEMPLATE_STATUS.ACTIVE,
  };
};

const findTemplateOrThrow = async ({ id, tenantId = null, session = null }) => {
  const query = { _id: toObjectId(id, "templateId") };

  if (tenantId !== undefined) {
    query.tenantId = tenantId === null ? null : toObjectId(tenantId, "tenantId");
  }

  const template = await ReportTemplate.findOne(query).session(session);
  if (!template) {
    throw ApiError.notFound("Template not found");
  }
  return template;
};

const ensureMutableTemplate = (template) => {
  if (template.isSystemLocked) {
    throw ApiError.badRequest("System locked template cannot be modified");
  }
  if (template.status === TEMPLATE_STATUS.ARCHIVED) {
    throw ApiError.badRequest("Archived template cannot be modified");
  }
};

const triggerTemplateNotifications = async ({
  action,
  tenantId,
  actorId,
  template,
  recipients = [],
}) => {
  const titleMap = {
    created: "Template created",
    updated: "Template updated",
    disabled: "Template disabled",
    enabled: "Template enabled",
    archived: "Template archived",
    cloned: "Template cloned",
  };

  await safeSendNotification({
    tenantId,
    actorId,
    type: "REPORT_TEMPLATE_EVENT",
    action,
    title: titleMap[action] ?? "Template event",
    entityType: "template",
    entityId: template._id,
    recipients,
    payload: {
      templateId: template._id,
      code: template.code,
      name: template.name,
      reportType: template.reportType,
      departmentType: template.departmentType,
      status: template.status,
    },
  });
};

const triggerTemplateEmail = async ({
  action,
  template,
  to = [],
  tenantId,
  actorId,
}) => {
  if (!Array.isArray(to) || !to.length) return;

  await safeSendEmail({
    tenantId,
    actorId,
    to,
    subject: `[Template ${action}] ${template.name}`,
    template: "report-template-event",
    data: {
      action,
      templateName: template.name,
      templateCode: template.code,
      departmentType: template.departmentType,
      reportType: template.reportType,
      status: template.status,
    },
  });
};

export async function createTemplate({ tenantId, actorId, payload, meta = {}, notify = true, emailTo = [] }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    action: "create",
    meta,
    execute: async () => {
      const normalized = normalizePayload(payload, tenantId);
      await validateBusinessRules({ tenantId, payload: normalized });

      const template = await ReportTemplate.create({
        ...normalized,
        createdBy: toObjectId(actorId, "actorId"),
        updatedBy: toObjectId(actorId, "actorId"),
        publishedAt: normalized.status === TEMPLATE_STATUS.ACTIVE ? now() : null,
        archivedAt: normalized.status === TEMPLATE_STATUS.ARCHIVED ? now() : null,
      });

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "create",
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (notify) {
        await triggerTemplateNotifications({
          action: "created",
          tenantId,
          actorId,
          template,
          recipients: normalized.access.allowedUserIds,
        });
      }

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "created",
          template,
          to: emailTo,
          tenantId,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function updateTemplate({ tenantId, id, payload, actorId, meta = {}, notify = true, emailTo = [] }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: id,
    action: "update",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId });
      ensureMutableTemplate(template);

      const before = template.toObject();
      const normalized = normalizePayload(
        {
          ...before,
          ...payload,
        },
        tenantId
      );

      await validateBusinessRules({
        tenantId,
        payload: normalized,
        templateId: id,
      });

      Object.assign(template, normalized, {
        updatedBy: toObjectId(actorId, "actorId"),
      });

      if (template.status === TEMPLATE_STATUS.ACTIVE && !template.publishedAt) {
        template.publishedAt = now();
      }
      if (template.status !== TEMPLATE_STATUS.ARCHIVED) {
        template.archivedAt = null;
      }

      await template.save();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "update",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (notify) {
        await triggerTemplateNotifications({
          action: "updated",
          tenantId,
          actorId,
          template,
          recipients: template.access?.allowedUserIds ?? [],
        });
      }

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "updated",
          template,
          to: emailTo,
          tenantId,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function getTemplateById({ tenantId, id, includeArchived = false }) {
  return serviceWrapper({
    tenantId,
    entityType: "template",
    entityId: id,
    action: "get_by_id",
    meta: { includeArchived },
    execute: async () => {
      const filter = {
        _id: toObjectId(id, "templateId"),
        tenantId: toObjectId(tenantId, "tenantId"),
      };

      if (!includeArchived) {
        filter.status = { $ne: TEMPLATE_STATUS.ARCHIVED };
      }

      const doc = await ReportTemplate.findOne(filter).lean();
      if (!doc) {
        throw ApiError.notFound("Template not found");
      }

      return doc;
    },
  });
}

export async function listTemplates({ tenantId, query = {} }) {
  return serviceWrapper({
    tenantId,
    entityType: "template",
    action: "list",
    meta: { query },
    execute: async () => {
      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

      const filter = {
        tenantId: query.templateScope === TEMPLATE_SCOPE.SYSTEM
          ? null
          : toObjectId(tenantId, "tenantId"),
      };

      if (query.templateScope) filter.templateScope = query.templateScope;
      if (query.departmentType) filter.departmentType = query.departmentType;
      if (query.reportType) filter.reportType = query.reportType;
      if (query.status) filter.status = query.status;
      if (query.isDefault !== undefined) filter.isDefault = query.isDefault === "true" || query.isDefault === true;
      if (query.departmentScope) filter.departmentScope = query.departmentScope;

      if (query.departmentId) {
        filter.departmentIds = { $in: [toObjectId(query.departmentId, "departmentId")] };
      }

      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: "i" } },
          { code: { $regex: query.search, $options: "i" } },
          { description: { $regex: query.search, $options: "i" } },
          { tags: { $regex: query.search, $options: "i" } },
        ];
      }

      const [docs, total] = await Promise.all([
        ReportTemplate.find(filter)
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ReportTemplate.countDocuments(filter),
      ]);

      return {
        docs,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    },
  });
}

export async function disableTemplate({ tenantId, id, actorId, meta = {}, notify = true, emailTo = [] }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: id,
    action: "disable",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId });
      ensureMutableTemplate(template);

      if (template.status === TEMPLATE_STATUS.DISABLED) {
        throw ApiError.badRequest("Template already disabled");
      }

      const before = template.toObject();
      template.status = TEMPLATE_STATUS.DISABLED;
      template.updatedBy = toObjectId(actorId, "actorId");
      await template.save();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "disable",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (notify) {
        await triggerTemplateNotifications({
          action: "disabled",
          tenantId,
          actorId,
          template,
          recipients: template.access?.allowedUserIds ?? [],
        });
      }

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "disabled",
          template,
          to: emailTo,
          tenantId,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function enableTemplate({ tenantId, id, actorId, meta = {}, notify = true, emailTo = [] }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: id,
    action: "enable",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId });
      ensureMutableTemplate(template);

      if (template.status === TEMPLATE_STATUS.ACTIVE) {
        throw ApiError.badRequest("Template already active");
      }

      const before = template.toObject();
      template.status = TEMPLATE_STATUS.ACTIVE;
      template.updatedBy = toObjectId(actorId, "actorId");
      if (!template.publishedAt) {
        template.publishedAt = now();
      }

      await template.save();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "enable",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (notify) {
        await triggerTemplateNotifications({
          action: "enabled",
          tenantId,
          actorId,
          template,
          recipients: template.access?.allowedUserIds ?? [],
        });
      }

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "enabled",
          template,
          to: emailTo,
          tenantId,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function archiveTemplate({ tenantId, id, actorId, meta = {}, notify = true, emailTo = [] }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: id,
    action: "archive",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId });
      ensureMutableTemplate(template);

      const before = template.toObject();
      template.status = TEMPLATE_STATUS.ARCHIVED;
      template.archivedAt = now();
      template.updatedBy = toObjectId(actorId, "actorId");
      await template.save();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "archive",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (notify) {
        await triggerTemplateNotifications({
          action: "archived",
          tenantId,
          actorId,
          template,
          recipients: template.access?.allowedUserIds ?? [],
        });
      }

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "archived",
          template,
          to: emailTo,
          tenantId,
          actorId,
        });
      }

      return { success: true, template: template.toObject() };
    },
  });
}

export async function restoreArchivedTemplate({ tenantId, id, actorId, meta = {} }) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: id,
    action: "restore_archived",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId });

      if (template.status !== TEMPLATE_STATUS.ARCHIVED) {
        throw ApiError.badRequest("Only archived template can be restored");
      }

      if (template.isSystemLocked) {
        throw ApiError.badRequest("System locked template cannot be restored");
      }

      const before = template.toObject();
      template.status = TEMPLATE_STATUS.ACTIVE;
      template.archivedAt = null;
      template.updatedBy = toObjectId(actorId, "actorId");
      if (!template.publishedAt) {
        template.publishedAt = now();
      }

      await template.save();

      await safeRecordAudit({
        tenantId,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "restore_archived",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      return template.toObject();
    },
  });
}

export async function cloneTemplate({
  tenantId,
  templateId,
  actorId,
  meta = {},
  overrides = {},
  emailTo = [],
}) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: templateId,
    action: "clone",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();

      try {
        let cloned;

        await session.withTransaction(async () => {
          const source = await findTemplateOrThrow({ id: templateId, tenantId, session });

          const clonePayload = normalizePayload(
            {
              templateScope: TEMPLATE_SCOPE.TENANT,
              parentTemplateId: source._id,
              code: overrides.code ?? `${source.code}_COPY_${Date.now()}`,
              name: overrides.name ?? `${source.name} Copy`,
              description: overrides.description ?? source.description,
              departmentType: overrides.departmentType ?? source.departmentType,
              reportType: overrides.reportType ?? source.reportType,
              generation: overrides.generation ?? source.generation,
              departmentScope: overrides.departmentScope ?? source.departmentScope,
              departmentIds: overrides.departmentIds ?? source.departmentIds,
              teamIds: overrides.teamIds ?? source.teamIds,
              userIds: overrides.userIds ?? source.userIds,
              sections: overrides.sections ?? source.sections,
              outputDefaults: overrides.outputDefaults ?? source.outputDefaults,
              access: overrides.access ?? source.access,
              isDefault: overrides.isDefault ?? false,
              isSystemLocked: false,
              version: (source.version ?? 1) + 1,
              tags: overrides.tags ?? source.tags,
              status: overrides.status ?? TEMPLATE_STATUS.ACTIVE,
            },
            tenantId
          );

          await validateBusinessRules({
            tenantId,
            payload: clonePayload,
            session,
          });

          const [created] = await ReportTemplate.create(
            [
              {
                ...clonePayload,
                createdBy: toObjectId(actorId, "actorId"),
                updatedBy: toObjectId(actorId, "actorId"),
                publishedAt: clonePayload.status === TEMPLATE_STATUS.ACTIVE ? now() : null,
                archivedAt: clonePayload.status === TEMPLATE_STATUS.ARCHIVED ? now() : null,
              },
            ],
            { session }
          );

          cloned = created.toObject();
        });

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "template",
          entityId: cloned._id,
          action: "clone",
          after: cloned,
          meta: buildAuditMeta(meta, { success: true, sourceTemplateId: templateId }),
        });

        await triggerTemplateNotifications({
          action: "cloned",
          tenantId,
          actorId,
          template: cloned,
          recipients: cloned.access?.allowedUserIds ?? [],
        });

        if (emailTo.length) {
          await triggerTemplateEmail({
            action: "cloned",
            template: cloned,
            to: emailTo,
            tenantId,
            actorId,
          });
        }

        return cloned;
      } finally {
        await mongoose.connection?.readyState;
      }
    },
  });
}

export async function setDefaultTemplate({
  tenantId,
  templateId,
  actorId,
  meta = {},
}) {
  return serviceWrapper({
    tenantId,
    actorId,
    entityType: "template",
    entityId: templateId,
    action: "set_default",
    meta,
    execute: async () => {
      const session = await mongoose.startSession();

      try {
        let result;

        await session.withTransaction(async () => {
          const template = await findTemplateOrThrow({ id: templateId, tenantId, session });
          ensureMutableTemplate(template);

          const before = template.toObject();

          await ReportTemplate.updateMany(
            {
              tenantId: template.tenantId,
              departmentType: template.departmentType,
              reportType: template.reportType,
              _id: { $ne: template._id },
            },
            { $set: { isDefault: false } },
            { session }
          );

          template.isDefault = true;
          template.updatedBy = toObjectId(actorId, "actorId");
          await template.save({ session });

          result = {
            before,
            after: template.toObject(),
          };
        });

        await safeRecordAudit({
          tenantId,
          actorId,
          entityType: "template",
          entityId: templateId,
          action: "set_default",
          before: result.before,
          after: result.after,
          meta: buildAuditMeta(meta, { success: true }),
        });

        return result.after;
      } finally {
        await mongoose.connection?.readyState;
      }
    },
  });
}

export async function getDefaultTemplate({
  tenantId,
  departmentType,
  reportType,
  templateScope = TEMPLATE_SCOPE.TENANT,
}) {
  return serviceWrapper({
    tenantId,
    entityType: "template",
    action: "get_default",
    meta: { departmentType, reportType, templateScope },
    execute: async () => {
      const filter = {
        tenantId: templateScope === TEMPLATE_SCOPE.SYSTEM ? null : toObjectId(tenantId, "tenantId"),
        templateScope,
        departmentType,
        reportType,
        isDefault: true,
        status: TEMPLATE_STATUS.ACTIVE,
      };

      const template = await ReportTemplate.findOne(filter)
        .sort({ version: -1, updatedAt: -1 })
        .lean();

      if (!template) {
        throw ApiError.notFound("Default template not found");
      }

      return template;
    },
  });
}

export async function resolveTemplateForDepartment({
  tenantId,
  departmentId,
  reportType,
}) {
  return serviceWrapper({
    tenantId,
    entityType: "template",
    action: "resolve_for_department",
    meta: { departmentId, reportType },
    execute: async () => {
      const department = await Department.findOne({
        _id: toObjectId(departmentId, "departmentId"),
        tenantId: toObjectId(tenantId, "tenantId"),
      }).lean();

      if (!department) {
        throw ApiError.notFound("Department not found");
      }

      const tenantAssigned = await ReportTemplate.findOne({
        tenantId: toObjectId(tenantId, "tenantId"),
        reportType,
        departmentScope: DEPARTMENT_SCOPE.SELECTED,
        departmentIds: { $in: [department._id] },
        status: TEMPLATE_STATUS.ACTIVE,
      })
        .sort({ isDefault: -1, version: -1, updatedAt: -1 })
        .lean();

      if (tenantAssigned) return tenantAssigned;

      const tenantDefault = await ReportTemplate.findOne({
        tenantId: toObjectId(tenantId, "tenantId"),
        departmentType: department.type,
        reportType,
        isDefault: true,
        status: TEMPLATE_STATUS.ACTIVE,
      })
        .sort({ version: -1, updatedAt: -1 })
        .lean();

      if (tenantDefault) return tenantDefault;

      const systemDefault = await ReportTemplate.findOne({
        tenantId: null,
        templateScope: TEMPLATE_SCOPE.SYSTEM,
        departmentType: department.type,
        reportType,
        isDefault: true,
        status: TEMPLATE_STATUS.ACTIVE,
      })
        .sort({ version: -1, updatedAt: -1 })
        .lean();

      if (systemDefault) return systemDefault;

      throw ApiError.notFound("No matching template found for department/reportType");
    },
  });
}

export async function listSystemTemplates({ query = {} }) {
  return serviceWrapper({
    tenantId: null,
    entityType: "template",
    action: "list_system",
    meta: { query },
    execute: async () => {
      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

      const filter = {
        tenantId: null,
        templateScope: TEMPLATE_SCOPE.SYSTEM,
      };

      if (query.departmentType) filter.departmentType = query.departmentType;
      if (query.reportType) filter.reportType = query.reportType;
      if (query.status) filter.status = query.status;

      const [docs, total] = await Promise.all([
        ReportTemplate.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ReportTemplate.countDocuments(filter),
      ]);

      return {
        docs,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    },
  });
}

export async function createSystemTemplate({ actorId, payload, meta = {}, emailTo = [] }) {
  return serviceWrapper({
    tenantId: null,
    actorId,
    entityType: "template",
    action: "create_system",
    meta,
    execute: async () => {
      const normalized = normalizePayload(
        {
          ...payload,
          templateScope: TEMPLATE_SCOPE.SYSTEM,
        },
        null
      );

      await validateBusinessRules({
        tenantId: null,
        payload: normalized,
      });

      const template = await ReportTemplate.create({
        ...normalized,
        tenantId: null,
        templateScope: TEMPLATE_SCOPE.SYSTEM,
        createdBy: toObjectId(actorId, "actorId"),
        updatedBy: toObjectId(actorId, "actorId"),
        publishedAt: normalized.status === TEMPLATE_STATUS.ACTIVE ? now() : null,
      });

      await safeRecordAudit({
        tenantId: null,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "create_system",
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "created",
          template,
          to: emailTo,
          tenantId: null,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function updateSystemTemplate({ id, actorId, payload, meta = {}, emailTo = [] }) {
  return serviceWrapper({
    tenantId: null,
    actorId,
    entityType: "template",
    entityId: id,
    action: "update_system",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId: null });

      if (template.templateScope !== TEMPLATE_SCOPE.SYSTEM) {
        throw ApiError.badRequest("Not a system template");
      }

      const before = template.toObject();

      const normalized = normalizePayload(
        {
          ...before,
          ...payload,
          templateScope: TEMPLATE_SCOPE.SYSTEM,
        },
        null
      );

      await validateBusinessRules({
        tenantId: null,
        payload: normalized,
        templateId: id,
      });

      Object.assign(template, normalized, {
        updatedBy: toObjectId(actorId, "actorId"),
      });

      await template.save();

      await safeRecordAudit({
        tenantId: null,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "update_system",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      if (emailTo.length) {
        await triggerTemplateEmail({
          action: "updated",
          template,
          to: emailTo,
          tenantId: null,
          actorId,
        });
      }

      return template.toObject();
    },
  });
}

export async function deleteSystemTemplate({ id, actorId, meta = {} }) {
  return serviceWrapper({
    tenantId: null,
    actorId,
    entityType: "template",
    entityId: id,
    action: "delete_system",
    meta,
    execute: async () => {
      const template = await findTemplateOrThrow({ id, tenantId: null });

      if (template.templateScope !== TEMPLATE_SCOPE.SYSTEM) {
        throw ApiError.badRequest("Not a system template");
      }

      if (template.isSystemLocked) {
        throw ApiError.badRequest("System locked template cannot be archived");
      }

      const before = template.toObject();
      template.status = TEMPLATE_STATUS.ARCHIVED;
      template.archivedAt = now();
      template.updatedBy = toObjectId(actorId, "actorId");
      await template.save();

      await safeRecordAudit({
        tenantId: null,
        actorId,
        entityType: "template",
        entityId: template._id,
        action: "delete_system",
        before,
        after: template.toObject(),
        meta: buildAuditMeta(meta, { success: true }),
      });

      return { success: true };
    },
  });
}