import { http, extractErrorMessage } from "./http";
import type { Notification } from "../types";

export async function listNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  try {
    const { data } = await http.get("/notifications");
    return { notifications: data.notifications, unreadCount: data.unreadCount };
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load notifications."));
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
