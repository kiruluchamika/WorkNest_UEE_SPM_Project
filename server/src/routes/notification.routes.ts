import { Router } from "express";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  registerPushToken,
  unregisterPushToken,
} from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const notificationRoutes = Router();

notificationRoutes.get("/", requireAuth, listNotifications);
notificationRoutes.get("/unread-count", requireAuth, getUnreadCount);
notificationRoutes.post("/push-token", requireAuth, registerPushToken);
notificationRoutes.delete("/push-token", requireAuth, unregisterPushToken);
notificationRoutes.patch("/read-all", requireAuth, markAllNotificationsRead);
notificationRoutes.patch("/:notificationId/read", requireAuth, markNotificationRead);
