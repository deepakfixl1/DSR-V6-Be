import { asyncHandler } from "#api/middlewares/asyncHandler.middleware.js";
import { analyzeWorkReportWithAI } from "./aireportservice.js";

export const analyzeWorkReport = asyncHandler(async (req, res) => {
  const result = await analyzeWorkReportWithAI({
    tenantId: req.params.tenantId,
    reportId: req.validated.body.reportId,
  });

  return res.status(200).json({
    message: "Work report analysis generated successfully",
    data: result,
  });
});