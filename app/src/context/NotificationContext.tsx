import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import * as notificationApi from "../api/notificationApi";
import { useAuth } from "./AuthContext";
import type { Notification } from "../types";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await notificationApi.listNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // So the header bell badge reflects unread notifications as soon as the
  // user logs in, not only after they've visited the Notifications screen.
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await notificationApi.markNotificationRead(id);
    } catch (err) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      setUnreadCount((count) => count + 1);
      throw err;
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationApi.markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      setUnreadCount(previousUnreadCount);
      throw err;
    }
  }, [notifications, unreadCount]);

  const value = useMemo(
    () => ({ notifications, unreadCount, isLoading, refresh, markRead, markAllRead }),
    [notifications, unreadCount, isLoading, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
