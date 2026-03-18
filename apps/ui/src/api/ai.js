import { apiClient } from "./client.js";

export const aiApi = {
  assistantQuery: (payload) => apiClient.post("/ai/assistant/query", payload),
  auditSearch: (payload) => apiClient.post("/ai/audit/search", payload)
};
