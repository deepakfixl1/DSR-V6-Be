import { apiClient } from "./client.js";

export const authApi = {
  signup: (payload) => apiClient.post("/auth/signup", payload),
  verifyEmail: (payload) => apiClient.post("/auth/verify-email", payload),
  resendVerification: (payload) => apiClient.post("/auth/resend-verification", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  refresh: (payload) => apiClient.post("/auth/refresh", payload),
  logout: (payload) => apiClient.post("/auth/logout", payload),
  logoutAll: (payload) => apiClient.post("/auth/logout-all", payload),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload)
};
