import { apiClient } from "./client.js";

export const reportApi = {
  createTemplate: (payload) => apiClient.post("/reports/templates", payload),
  updateTemplate: (templateId, payload) => apiClient.put(`/reports/templates/${templateId}`, payload),
  getTemplate: (templateId) => apiClient.get(`/reports/templates/${templateId}`),
  listTemplates: (params) => apiClient.get("/reports/templates", { params }),
  deleteTemplate: (templateId) => apiClient.delete(`/reports/templates/${templateId}`),
  updateTemplateStatus: (templateId, payload) =>
    apiClient.patch(`/reports/templates/${templateId}/status`, payload),
  cloneTemplate: (templateId) => apiClient.post(`/reports/templates/${templateId}/clone`),

  getUpcomingSchedules: (params) => apiClient.get("/reports/schedules/upcoming", { params }),
  createSchedule: (payload) => apiClient.post("/reports/schedules", payload),
  updateSchedule: (scheduleId, payload) =>
    apiClient.put(`/reports/schedules/${scheduleId}`, payload),
  pauseSchedule: (scheduleId) => apiClient.patch(`/reports/schedules/${scheduleId}/pause`),
  resumeSchedule: (scheduleId) => apiClient.patch(`/reports/schedules/${scheduleId}/resume`),
  deleteSchedule: (scheduleId) => apiClient.delete(`/reports/schedules/${scheduleId}`),
  listSchedules: (params) => apiClient.get("/reports/schedules", { params }),
  runScheduleNow: (scheduleId, payload) =>
    apiClient.post(`/reports/schedules/${scheduleId}/run`, payload),

  runTemplate: (templateId, payload) =>
    apiClient.post(`/reports/templates/${templateId}/run`, payload),
  listRuns: (params) => apiClient.get("/reports/runs", { params }),
  getRun: (runId) => apiClient.get(`/reports/runs/${runId}`),
  retryRun: (runId) => apiClient.post(`/reports/runs/${runId}/retry`),
  deleteRun: (runId) => apiClient.delete(`/reports/runs/${runId}`),
  downloadRun: (runId) => apiClient.get(`/reports/runs/${runId}/download`),
  getStats: () => apiClient.get("/reports/stats")
};
