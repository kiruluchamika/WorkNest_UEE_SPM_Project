import { http, extractErrorMessage } from "./http";
import type { Notification } from "../types";

export interface ListNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export async function listNotifications(page = 1, limit = 20): Promise<ListNotificationsResult> {
  try {
    const { data } = await http.get("/notifications", { params: { page, limit } });
    return { notifications: data.notifications, unreadCount: data.unreadCount, total: data.total };
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load notifications."));
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const { data } = await http.get("/notifications/unread-count");
    return data.unreadCount;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load unread count."));
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await http.patch(`/notifications/${notificationId}/read`);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update this notification."));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await http.patch("/notifications/read-all");
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update notifications."));
  }
}
