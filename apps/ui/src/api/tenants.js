import { apiClient } from "./client.js";

export const tenantApi = {
  create: (payload) => apiClient.post("/tenants", payload),
  listMyTenants: () => apiClient.get("/tenants"),
  getById: (tenantId) => apiClient.get(`/tenants/${tenantId}`),
  update: (tenantId, payload) => apiClient.patch(`/tenants/${tenantId}`, payload),
  delete: (tenantId) => apiClient.delete(`/tenants/${tenantId}`),
  getSettings: (tenantId) => apiClient.get(`/tenants/${tenantId}/settings`),
  updateSettings: (tenantId, payload) => apiClient.patch(`/tenants/${tenantId}/settings`, payload)
};
