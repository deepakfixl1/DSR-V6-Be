import { apiClient } from "./client.js";

export const auditApi = {
  list: (params) => apiClient.get("/audit", { params }),
  getById: (id) => apiClient.get(`/audit/${id}`)
};
