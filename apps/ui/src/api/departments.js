import { apiClient } from "./client.js";

export const departmentApi = {
  create: (tenantId, payload) => apiClient.post(`/tenants/${tenantId}/departments`, payload),
  list: (tenantId, params) => apiClient.get(`/tenants/${tenantId}/departments`, { params }),
  getById: (tenantId, departmentId) =>
    apiClient.get(`/tenants/${tenantId}/departments/${departmentId}`),
  update: (tenantId, departmentId, payload) =>
    apiClient.patch(`/tenants/${tenantId}/departments/${departmentId}`, payload),
  delete: (tenantId, departmentId) =>
    apiClient.delete(`/tenants/${tenantId}/departments/${departmentId}`)
};
