import mongoose from "mongoose";
import { ReportRun, ReportTemplate } from "#db/models/index.js";
import { logger } from "#api/utils/logger.js";
import { log as auditLog } from "#api/modules/audit/audit.service.js";
import { createNotification } from "#api/modules/notification/notification.service.js";

/**
 * Execute a report run
 */
export async function executeReport({ runId, tenantId, templateId, period, scope, outputFormats }) {
  const startTime = Date.now();

  try {
    logger.info({ runId, tenantId, templateId }, "Starting report execution");

    // Update run status to running
    await ReportRun.findByIdAndUpdate(runId, {
      status: "running",
      "job.startedAt": new Date(),
      $inc: { "job.attempts": 1 }
    });

    // Fetch template
    const template = await ReportTemplate.findOne({
      _id: new mongoose.Types.ObjectId(templateId),
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).lean();

    if (!template) {
      throw new Error("Template not found");
    }

    // Build aggregation pipeline
    const aggregationResults = await buildAndExecuteAggregations({
      template,
      tenantId,
      period,
      scope
    });

    // Generate output files (stubbed for now)
    const outputs = await generateOutputFiles({
      template,
      aggregationResults,
      outputFormats,
      tenantId,
      runId
    });

    // Update run with success
    const durationMs = Date.now() - startTime;
    await ReportRun.findByIdAndUpdate(runId, {
      status: "success",
      outputs,
      dataSummary: aggregationResults.summary,
      "job.finishedAt": new Date(),
      "job.durationMs": durationMs
    });

    // Audit log
    await auditLog({
      action: "REPORT_RUN_SUCCESS",
      resourceType: "ReportRun",
      resourceId: new mongoose.Types.ObjectId(runId),
      userId: null,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: {
        templateId,
        durationMs,
        outputCount: outputs.length
      }
    });

    // Send notification
    await sendReportNotification({
      tenantId,
      runId,
      templateName: template.name,
      status: "success"
    });

    logger.info({
      runId,
      tenantId,
      templateId,
      durationMs
    }, "Report execution completed successfully");

    return { success: true, runId, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.error({
      runId,
      tenantId,
      templateId,
      error: error.message,
      stack: error.stack
    }, "Report execution failed");

    // Update run with failure
    await ReportRun.findByIdAndUpdate(runId, {
      status: "failed",
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code || "EXECUTION_ERROR"
      },
      "job.finishedAt": new Date(),
      "job.durationMs": durationMs
    });

    // Audit log
    await auditLog({
      action: "REPORT_RUN_FAILED",
      resourceType: "ReportRun",
      resourceId: new mongoose.Types.ObjectId(runId),
      userId: null,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      metadata: {
        templateId,
        error: error.message,
        durationMs
      }
    });

    // Send failure notification
    await sendReportNotification({
      tenantId,
      runId,
      templateName: "Report",
      status: "failed",
      error: error.message
    });

    throw error;
  }
}

/**
 * Build and execute aggregations for all sections
 */
async function buildAndExecuteAggregations({ template, tenantId, period, scope }) {
  const results = {};
  const summary = {};

  for (const section of template.sections) {
    if (!section.enabled) continue;

    try {
      const pipeline = buildSafeAggregationPipeline({
        section,
        tenantId,
        period,
        scope
      });

      // Execute aggregation (stubbed - would query actual collections)
      const data = await executeSectionAggregation(section.source.entity, pipeline);

      results[section.key] = data;
      summary[section.key] = {
        count: data.length,
        title: section.title
      };

      logger.debug({
        sectionKey: section.key,
        recordCount: data.length
      }, "Section aggregation completed");
    } catch (error) {
      logger.error({
        sectionKey: section.key,
        error: error.message
      }, "Section aggregation failed");

      results[section.key] = [];
      summary[section.key] = {
        count: 0,
        error: error.message
      };
    }
  }

  return { results, summary };
}

/**
 * Build safe aggregation pipeline with tenant isolation
 */
function buildSafeAggregationPipeline({ section, tenantId, period, scope }) {
  const pipeline = [];

  // CRITICAL: Tenant isolation
  const matchStage = {
    tenantId: new mongoose.Types.ObjectId(tenantId)
  };

  // Add period filter
  if (period) {
    matchStage.createdAt = {
      $gte: new Date(period.from),
      $lte: new Date(period.to)
    };
  }

  // Add scope filters
  if (scope.type === "DEPARTMENT" && scope.departmentId) {
    matchStage.departmentId = new mongoose.Types.ObjectId(scope.departmentId);
  } else if (scope.type === "TEAM" && scope.teamId) {
    matchStage.teamId = new mongoose.Types.ObjectId(scope.teamId);
  } else if (scope.type === "USER" && scope.userId) {
    matchStage.userId = new mongoose.Types.ObjectId(scope.userId);
  }

  // Add base filters from template (sanitized)
  if (section.source.baseFilters) {
    Object.assign(matchStage, sanitizeFilters(section.source.baseFilters));
  }

  pipeline.push({ $match: matchStage });

  // Add grouping if specified
  if (section.source.groupBy) {
    pipeline.push({ $group: section.source.groupBy });
  }

  // Add sorting
  if (section.source.sort) {
    pipeline.push({ $sort: section.source.sort });
  }

  // Add limit
  if (section.source.limit) {
    pipeline.push({ $limit: section.source.limit });
  }

  return pipeline;
}

/**
 * Sanitize filters to prevent injection
 */
function sanitizeFilters(filters) {
  const sanitized = {};

  for (const [key, value] of Object.entries(filters)) {
    // Block dangerous operators
    if (key.startsWith("$")) continue;

    // Only allow safe value types
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (value instanceof Date) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = { $in: value };
    }
  }

  return sanitized;
}

/**
 * Execute section aggregation (stubbed)
 */
async function executeSectionAggregation(entity, pipeline) {
  // In production, this would dynamically query the correct collection
  // For now, return mock data
  logger.debug({ entity, pipelineStages: pipeline.length }, "Executing aggregation");

  return [
    { _id: "1", label: "Sample Data", value: 100 },
    { _id: "2", label: "Sample Data 2", value: 200 }
  ];
}

/**
 * Generate output files
 */
async function generateOutputFiles({ template, aggregationResults, outputFormats, tenantId, runId }) {
  const outputs = [];

  for (const format of outputFormats) {
    const output = {
      format,
      file: {
        storage: "LOCAL",
        path: `/reports/${tenantId}/${runId}/${format.toLowerCase()}/report.${format.toLowerCase()}`,
        sizeBytes: 1024,
        checksum: "stub-checksum"
      }
    };

    outputs.push(output);

    logger.debug({
      runId,
      format,
      path: output.file.path
    }, "Output file generated");
  }

  return outputs;
}

/**
 * Send report notification
 */
async function sendReportNotification({ tenantId, runId, templateName, status, error }) {
  try {
    await createNotification({
      userId: null,
      memberId: null,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      scope: "tenant",
      type: status === "success" ? "REPORT_COMPLETED" : "REPORT_FAILED",
      title: status === "success" ? "Report Ready" : "Report Failed",
      body:
        status === "success"
          ? `Report \"${templateName}\" has been generated successfully.`
          : `Report \"${templateName}\" failed: ${error}`,
      priority: status === "success" ? "normal" : "high",
      payload: { runId, status, templateName }
    });

    logger.debug({ tenantId, runId, status }, "Report notification sent");
  } catch (error) {
    logger.error({
      tenantId,
      runId,
      error: error.message
    }, "Failed to send report notification");
  }
}
