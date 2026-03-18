/**
 * Notification controller. No business logic; delegates to service.
 */

import * as notificationService from "#api/modules/notification/notification.service.js";

/**
 * GET /notifications - list notifications for current user.
 */
export async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId, page, limit, unreadOnly } = req.validated?.query ?? {};
    const result = await notificationService.list({
      userId,
      tenantId: tenantId ?? null,
      page,
      limit,
      unreadOnly
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /notifications/unread-count - unread count for current user.
 */
export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId } = req.validated?.query ?? {};
    const count = await notificationService.getUnreadCount(userId, tenantId ?? null);
    return res.status(200).json({ count });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /notifications/:id/read - mark notification as read.
 */
export async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.validated.params;
    const { tenantId } = req.validated?.query ?? {};
    const doc = await notificationService.markAsRead(id, userId, tenantId ?? null);
    if (!doc) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId } = req.validated?.query ?? {};
    const result = await notificationService.markAllAsRead(userId, tenantId ?? null);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId } = req.validated?.query ?? {};
    const { id } = req.validated.params;
    const doc = await notificationService.removeNotification(id, userId, tenantId ?? null);
    if (!doc) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId } = req.validated?.query ?? {};
    const data = await notificationService.getPreferences(userId, tenantId ?? null);
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const { tenantId } = req.validated?.query ?? {};
    const data = await notificationService.updatePreferences(
      userId,
      tenantId ?? null,
      req.validated.body.preferences
    );
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}
