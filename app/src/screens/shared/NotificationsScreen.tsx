import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { NotificationItem } from "../../components/common/NotificationItem";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Button } from "../../components/common/Button";
import { navigateToNotificationLink } from "../../navigation/notificationLinks";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { Notification } from "../../types";

export const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const {
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
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh().catch(() => {});
    setRefreshing(false);
  };

  const handlePress = (notification: Notification) => {
    if (!notification.isRead) markRead(notification.id).catch(() => {});
    navigateToNotificationLink(notification.link, user?.role);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 ? (
            <Text style={styles.unreadCountText}>
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => markAllRead().catch(() => {})}
            activeOpacity={0.75}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && notifications.length === 0 ? (
        <LoadingSpinner message="Loading notifications..." />
      ) : error && notifications.length === 0 ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try Again" variant="outline" onPress={() => refresh()} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => <NotificationItem notification={item} onPress={handlePress} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ marginVertical: spacing.md }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Feather name="bell-off" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet.</Text>
              <Text style={styles.emptyText}>
                Important updates about gigs and reviews will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  unreadCountText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  markAllButton: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    fontWeight: "800",
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
