import { apiClient } from "./client.js";

export const taskApi = {
  create: (tenantId, payload) => apiClient.post(`/tenants/${tenantId}/tasks`, payload),
  list: (tenantId, params) => apiClient.get(`/tenants/${tenantId}/tasks`, { params }),
  getById: (tenantId, taskId) => apiClient.get(`/tenants/${tenantId}/tasks/${taskId}`),
  update: (tenantId, taskId, payload) =>
    apiClient.patch(`/tenants/${tenantId}/tasks/${taskId}`, payload),
  delete: (tenantId, taskId) => apiClient.delete(`/tenants/${tenantId}/tasks/${taskId}`)
};
