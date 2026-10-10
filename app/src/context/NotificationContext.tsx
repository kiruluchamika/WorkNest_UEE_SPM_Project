import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import * as notificationApi from "../api/notificationApi";
import { useAuth } from "./AuthContext";
import {
  addForegroundNotificationListener,
  addNotificationResponseListener,
  getLastNotificationResponseAsync,
} from "../utils/pushNotifications";
import { navigateToNotificationLink } from "../navigation/notificationLinks";
import type { Notification } from "../types";

const PAGE_SIZE = 20;

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await notificationApi.listNotifications(1, PAGE_SIZE);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setPage(1);
      setHasMore(result.notifications.length < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // So the header bell badge reflects unread notifications as soon as the
  // user logs in, not only after they've visited the Notifications screen.
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;

    const subscription = addForegroundNotificationListener(() => {
      refresh().catch(() => {});
    });

    return () => subscription.remove();
  }, [user, refresh]);

  // Tapping a notification while the app is foregrounded, backgrounded, or
  // being launched by the tap itself.
  useEffect(() => {
    if (!user) return;

    const subscription = addNotificationResponseListener((data) => {
      navigateToNotificationLink(data.link, user.role);
      refresh().catch(() => {});
    });

    return () => subscription.remove();
  }, [user, refresh]);

  // True cold start: the app process wasn't running and got launched by a
  // notification tap. Checked once per app launch — `user` isn't resolved
  // yet on the first render, so the latest value is read via a ref once the
  // check settles. If the navigator isn't mounted yet either, the link is
  // queued and replayed by RootNavigator's onReady.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    getLastNotificationResponseAsync().then((data) => {
      if (!cancelled && data?.link) navigateToNotificationLink(data.link, userRef.current?.role);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!user || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await notificationApi.listNotifications(nextPage, PAGE_SIZE);
      setNotifications((prev) => {
        const combined = [...prev, ...result.notifications];
        setHasMore(combined.length < result.total);
        return combined;
      });
      setUnreadCount(result.unreadCount);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, isLoadingMore, hasMore, page]);

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
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      hasMore,
      error,
      refresh,
      loadMore,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, isLoading, isLoadingMore, hasMore, error, refresh, loadMore, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
