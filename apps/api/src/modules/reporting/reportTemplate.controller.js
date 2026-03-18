import * as templateService from "./reportTemplate.service.js";

/**
 * Create a new report template
 */
export async function createTemplate(req, res, next) {
  try {
    const template = await templateService.createTemplate({
      tenantId: req.tenantId,
      userId: req.user.id,
      data: req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a report template
 */
export async function updateTemplate(req, res, next) {
  try {
    const template = await templateService.updateTemplate({
      tenantId: req.tenantId,
      userId: req.user.id,
      templateId: req.validated.params.templateId,
      data: req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get template by ID
 */
export async function getTemplate(req, res, next) {
  try {
    const template = await templateService.getTemplateById({
      tenantId: req.tenantId,
      templateId: req.params.templateId
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List templates
 */
export async function listTemplates(req, res, next) {
  try {
    const result = await templateService.listTemplates({
      tenantId: req.tenantId,
      ...req.validated.query
    });

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(req, res, next) {
  try {
    await templateService.deleteTemplate({
      tenantId: req.tenantId,
      userId: req.user.id,
      templateId: req.params.templateId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update template status
 */
export async function updateTemplateStatus(req, res, next) {
  try {
    const template = await templateService.updateTemplateStatus({
      tenantId: req.tenantId,
      userId: req.user.id,
      templateId: req.validated.params.templateId,
      status: req.validated.body.status,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clone a template
 */
export async function cloneTemplate(req, res, next) {
  try {
    const template = await templateService.cloneTemplate({
      tenantId: req.tenantId,
      userId: req.user.id,
      templateId: req.params.templateId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
}
