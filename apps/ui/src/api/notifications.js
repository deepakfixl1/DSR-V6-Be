import { apiClient } from "./client.js";

export const notificationApi = {
  getUnreadCount: () => apiClient.get("/notifications/unread-count"),
  list: (params) => apiClient.get("/notifications", { params }),
  markAsRead: (id, payload = {}) => apiClient.patch(`/notifications/${id}/read`, payload)
};
