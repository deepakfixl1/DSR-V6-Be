import { apiClient } from "./client.js";

export const billingApi = {
  listPlans: (params) => apiClient.get("/billing/plans", { params }),
  createPlan: (payload) => apiClient.post("/billing/plans", payload),
  updatePlan: (planId, payload) => apiClient.patch(`/billing/plans/${planId}`, payload),
  togglePlan: (planId, payload) => apiClient.patch(`/billing/plans/${planId}/toggle`, payload),
  deletePlan: (planId) => apiClient.delete(`/billing/plans/${planId}`),
  getSubscription: (tenantId, params) => apiClient.get(`/billing/${tenantId}/subscription`, { params }),
  subscribe: (tenantId, payload) => apiClient.post(`/billing/${tenantId}/subscribe`, payload),
  upgrade: (tenantId, payload) => apiClient.post(`/billing/${tenantId}/upgrade`, payload),
  cancel: (tenantId, payload) => apiClient.post(`/billing/${tenantId}/cancel`, payload),
  resume: (tenantId, payload) => apiClient.post(`/billing/${tenantId}/resume`, payload),
  webhook: (payload, headers) =>
    apiClient.post("/billing/webhook", payload, { headers })
};
