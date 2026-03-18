import { apiClient } from "./client.js";

export const mfaApi = {
  verifyMFA: (payload) => apiClient.post("/auth/mfa/verify", payload),
  setupTOTP: (payload) => apiClient.post("/auth/mfa/setup", payload),
  verifyTOTPSetup: (payload) => apiClient.post("/auth/mfa/verify-setup", payload),
  disableMFA: (payload) => apiClient.post("/auth/mfa/disable", payload),
  getStatus: () => apiClient.get("/auth/mfa/status"),
  regenerateBackupCodes: (payload) =>
    apiClient.post("/auth/mfa/backup-codes/regenerate", payload)
};
