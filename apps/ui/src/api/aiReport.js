import { apiClient } from "./client.js";

export const aiReportApi = {
  generateDSR: (payload) => apiClient.post("/ai/report/dsr", payload),
  getLatestDSR: () => apiClient.get("/ai/report/dsr/latest"),
  generateWeekly: (payload) => apiClient.post("/ai/report/weekly", payload),
  generateMonthly: (payload) => apiClient.post("/ai/report/monthly", payload),
  generateQuarterly: (payload) => apiClient.post("/ai/report/quarterly", payload),
  generateYearly: (payload) => apiClient.post("/ai/report/yearly", payload),
  getStatus: (jobId) => apiClient.get(`/ai/report/status/${jobId}`),
  getHistory: (params) => apiClient.get("/ai/report/history", { params }),
  getReport: (reportId) => apiClient.get(`/ai/report/${reportId}`),
  exportReport: (reportId, payload) => apiClient.post(`/ai/report/export/${reportId}`, payload)
};
