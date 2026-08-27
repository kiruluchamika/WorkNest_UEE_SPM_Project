import { Router } from "express";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const notificationRoutes = Router();

notificationRoutes.get("/", requireAuth, listNotifications);
notificationRoutes.patch("/read-all", requireAuth, markAllNotificationsRead);
notificationRoutes.patch("/:notificationId/read", requireAuth, markNotificationRead);
