import { Request, Response, NextFunction } from "express";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import * as notificationService from "../services/notification.service";
import * as pushNotificationService from "../services/pushNotification.service";

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

export async function registerPushToken(
  req: Request<unknown, unknown, { token?: string; platform?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { token, platform } = req.body;

    if (!token) {
      return next(new HttpError(400, "Push token is required"));
    }

    try {
      await pushNotificationService.registerPushToken({ userId, token, platform });
    } catch {
      return next(new HttpError(400, "Invalid Expo push token"));
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function unregisterPushToken(
  req: Request<unknown, unknown, { token?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { token } = req.body;

    if (!token) {
      return next(new HttpError(400, "Push token is required"));
    }

    await pushNotificationService.unregisterPushToken(userId, token);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
