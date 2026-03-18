import * as runService from "./reportRun.service.js";

/**
 * Trigger a manual report run
 */
export async function runTemplate(req, res, next) {
  try {
    const run = await runService.triggerManualRun({
      tenantId: req.tenantId,
      userId: req.user.id,
      templateId: req.validated.params.templateId,
      data: req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(202).json({
      success: true,
      data: run,
      message: "Report run triggered"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List report runs
 */
export async function listRuns(req, res, next) {
  try {
    const result = await runService.listRuns({
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
 * Get run by ID
 */
export async function getRun(req, res, next) {
  try {
    const run = await runService.getRunById({
      tenantId: req.tenantId,
      runId: req.params.runId
    });

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retry a failed run
 */
export async function retryRun(req, res, next) {
  try {
    const run = await runService.retryRun({
      tenantId: req.tenantId,
      userId: req.user.id,
      runId: req.params.runId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(202).json({
      success: true,
      data: run,
      message: "Report run retried"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a run
 */
export async function deleteRun(req, res, next) {
  try {
    await runService.deleteRun({
      tenantId: req.tenantId,
      userId: req.user.id,
      runId: req.params.runId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      message: "Report run deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download report output
 */
export async function downloadRun(req, res, next) {
  try {
    const run = await runService.getRunById({
      tenantId: req.tenantId,
      runId: req.params.runId
    });

    if (run.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Report is not ready for download"
      });
    }

    // In production, this would stream the file from storage
    res.json({
      success: true,
      data: {
        runId: run._id,
        outputs: run.outputs,
        message: "Download links available in outputs"
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get report stats
 */
export async function getStats(req, res, next) {
  try {
    const stats = await runService.getReportStats({
      tenantId: req.tenantId
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
