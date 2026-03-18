import { apiClient } from "./client.js";

export const membershipApi = {
  listMembers: (tenantId, params) => apiClient.get(`/tenants/${tenantId}/members`, { params }),
  inviteMember: (tenantId, payload) => apiClient.post(`/tenants/${tenantId}/members/invite`, payload),
  acceptInvite: (tenantId, payload) => apiClient.post(`/tenants/${tenantId}/members/accept`, payload),
  updateMembership: (tenantId, userId, payload) =>
    apiClient.patch(`/tenants/${tenantId}/members/${userId}`, payload),
  removeMember: (tenantId, userId) => apiClient.delete(`/tenants/${tenantId}/members/${userId}`),
  transferOwnership: (tenantId, userId, payload) =>
    apiClient.post(`/tenants/${tenantId}/members/${userId}/transfer-ownership`, payload)
};
