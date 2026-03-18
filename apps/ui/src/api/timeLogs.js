import { apiClient } from "./client.js";

export const timeLogApi = {
  create: (tenantId, taskId, payload) =>
    apiClient.post(`/tenants/${tenantId}/tasks/${taskId}/time-logs`, payload),
  listForTask: (tenantId, taskId, params) =>
    apiClient.get(`/tenants/${tenantId}/tasks/${taskId}/time-logs`, { params }),
  getById: (tenantId, timeLogId) =>
    apiClient.get(`/tenants/${tenantId}/time-logs/${timeLogId}`),
  update: (tenantId, timeLogId, payload) =>
    apiClient.patch(`/tenants/${tenantId}/time-logs/${timeLogId}`, payload),
  delete: (tenantId, timeLogId) =>
    apiClient.delete(`/tenants/${tenantId}/time-logs/${timeLogId}`)
};
