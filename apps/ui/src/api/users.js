import { apiClient } from "./client.js";

export const userApi = {
  getMe: () => apiClient.get("/users/me"),
  updateMe: (payload) => apiClient.patch("/users/me", payload),
  changePassword: (payload) => apiClient.post("/users/change-password", payload),
  getSessions: () => apiClient.get("/users/sessions"),
  revokeSession: (tokenId) => apiClient.delete(`/users/sessions/${tokenId}`)
};
