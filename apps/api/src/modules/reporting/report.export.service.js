/**
 * Report Export Service. Handles export of AI reports to PDF, CSV, JSON formats.
 */

import AIReport from "#db/models/AIReport.model.js";
import {logger} from "#api/utils/logger.js";
import fs from "fs/promises";
import path from "path";

/**
 * Export report to JSON format
 */
export async function exportToJSON(reportId, tenantId) {
  const report = await AIReport.findOne({
    _id: reportId,
    tenantId,
    status: "completed"
  }).lean();

  if (!report) {
    throw new Error("Report not found");
  }

  const jsonData = {
    reportId: report._id,
    reportType: report.reportType,
    generatedAt: report.createdAt,
    period: report.period,
    narrative: report.narrative,
    summary: report.summary,
    risks: report.risks,
    recommendations: report.recommendations,
    forecast: report.forecast,
    trends: report.trends,
    metrics: report.metrics,
    confidenceScore: report.confidenceScore,
    explainability: report.explainability
  };

  // In production, upload to S3 and return signed URL
  // For now, return data directly
  const fileName = `report-${reportId}-${Date.now()}.json`;
  const fileUrl = `/exports/${fileName}`; // Mock URL

  // Update report with export metadata
  await AIReport.findByIdAndUpdate(reportId, {
    $push: {
      exports: {
        format: "JSON",
        fileUrl,
        generatedAt: new Date()
      }
    }
  });

  logger.info("Report exported to JSON", { reportId, fileUrl });

  return { fileUrl, data: jsonData };
}

/**
 * Export report to CSV format
 */
export async function exportToCSV(reportId, tenantId) {
  const report = await AIReport.findOne({
    _id: reportId,
    tenantId,
    status: "completed"
  }).lean();

  if (!report) {
    throw new Error("Report not found");
  }

  // Build CSV content
  let csvContent = `Report Type,${report.reportType}\n`;
  csvContent += `Generated At,${report.createdAt}\n`;
  csvContent += `Period Start,${report.period.start}\n`;
  csvContent += `Period End,${report.period.end}\n`;
  csvContent += `Confidence Score,${report.confidenceScore || "N/A"}\n`;
  csvContent += `\nNarrative\n"${report.narrative}"\n`;
  
  // Metrics
  csvContent += `\nMetrics\n`;
  csvContent += `Metric,Value\n`;
  Object.entries(report.metrics || {}).forEach(([key, value]) => {
    csvContent += `${key},${value}\n`;
  });

  // Risks
  if (report.risks && report.risks.length > 0) {
    csvContent += `\nRisks\n`;
    csvContent += `Type,Level,Description\n`;
    report.risks.forEach(risk => {
      csvContent += `${risk.type || "N/A"},${risk.level || risk.severity},${risk.description || risk.risk}\n`;
    });
  }

  // Recommendations
  if (report.recommendations && report.recommendations.length > 0) {
    csvContent += `\nRecommendations\n`;
    csvContent += `Priority,Text\n`;
    report.recommendations.forEach(rec => {
      csvContent += `${rec.priority || "medium"},"${rec.text}"\n`;
    });
  }

  const fileName = `report-${reportId}-${Date.now()}.csv`;
  const fileUrl = `/exports/${fileName}`; // Mock URL

  // Update report with export metadata
  await AIReport.findByIdAndUpdate(reportId, {
    $push: {
      exports: {
        format: "CSV",
        fileUrl,
        generatedAt: new Date()
      }
    }
  });

  logger.info("Report exported to CSV", { reportId, fileUrl });

  return { fileUrl, data: csvContent };
}

/**
 * Export report to PDF format (simplified - in production use puppeteer or similar)
 */
export async function exportToPDF(reportId, tenantId) {
  const report = await AIReport.findOne({
    _id: reportId,
    tenantId,
    status: "completed"
  }).lean();

  if (!report) {
    throw new Error("Report not found");
  }

  // Build HTML content for PDF generation
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.reportType} Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .risk { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .risk.high { background: #f8d7da; border-left-color: #dc3545; }
    .recommendation { background: #d1ecf1; padding: 10px; margin: 10px 0; border-left: 4px solid #17a2b8; }
    .narrative { line-height: 1.6; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${report.reportType} Report</h1>
  
  <div class="metadata">
    <strong>Generated:</strong> ${new Date(report.createdAt).toLocaleString()}<br>
    <strong>Period:</strong> ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}<br>
    <strong>Confidence Score:</strong> ${report.confidenceScore ? (report.confidenceScore * 100).toFixed(1) + '%' : 'N/A'}
  </div>

  <h2>Executive Summary</h2>
  <div class="narrative">${report.narrative || 'No narrative available'}</div>

  <h2>Key Metrics</h2>
  ${Object.entries(report.metrics || {}).map(([key, value]) => 
    `<div class="metric"><strong>${key}:</strong> ${value}</div>`
  ).join('')}

  ${report.risks && report.risks.length > 0 ? `
    <h2>Risks Identified</h2>
    ${report.risks.map(risk => `
      <div class="risk ${risk.level || risk.severity}">
        <strong>${risk.type || 'Risk'}:</strong> ${risk.description || risk.risk || 'No description'}
        <br><strong>Severity:</strong> ${risk.level || risk.severity}
      </div>
    `).join('')}
  ` : ''}

  ${report.recommendations && report.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${report.recommendations.map(rec => `
      <div class="recommendation">
        <strong>${rec.type || 'Recommendation'}:</strong> ${rec.text}
        <br><strong>Priority:</strong> ${rec.priority || 'medium'}
      </div>
    `).join('')}
  ` : ''}

  ${report.forecast ? `
    <h2>Forecast</h2>
    <div class="metadata">
      ${Object.entries(report.forecast).map(([key, value]) => 
        `<div><strong>${key}:</strong> ${value}</div>`
      ).join('')}
    </div>
  ` : ''}

  <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
    <p>Generated by AI-Powered Enterprise Intelligence Platform</p>
    <p>Report ID: ${report._id}</p>
  </div>
</body>
</html>
  `;

  // In production: Use puppeteer to convert HTML to PDF and upload to S3
  // For now, return HTML content
  const fileName = `report-${reportId}-${Date.now()}.pdf`;
  const fileUrl = `/exports/${fileName}`; // Mock URL

  // Update report with export metadata
  await AIReport.findByIdAndUpdate(reportId, {
    $push: {
      exports: {
        format: "PDF",
        fileUrl,
        generatedAt: new Date()
      }
    }
  });

  logger.info("Report exported to PDF", { reportId, fileUrl });

  return { fileUrl, htmlContent };
}

/**
 * Main export function - routes to appropriate format handler
 */
export async function exportReport(reportId, format, tenantId) {
  switch (format) {
    case "JSON":
      return await exportToJSON(reportId, tenantId);
    case "CSV":
      return await exportToCSV(reportId, tenantId);
    case "PDF":
      return await exportToPDF(reportId, tenantId);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
