import { Request, Response, NextFunction } from "express";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import * as notificationService from "../services/notification.service";

function parseFilter(value: unknown): "all" | "unread" | "read" {
  return value === "unread" || value === "read" ? value : "all";
}

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const filter = parseFilter(req.query.filter);

    const { notifications, unreadCount, total } = await notificationService.getNotificationsForUser(
      userId,
      { page, limit, filter }
    );

    res.json({ success: true, unreadCount, total, notifications });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const unreadCount = await notificationService.getUnreadCount(userId);
    res.json({ success: true, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(
  req: Request<{ notificationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { notificationId } = req.params;

    const notification = await notificationService.markNotificationRead(userId, notificationId);
    if (!notification) {
      return next(new HttpError(404, "Notification not found"));
    }

    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    await notificationService.markAllNotificationsRead(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
