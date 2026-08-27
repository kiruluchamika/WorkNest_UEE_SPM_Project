import React, { useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useNotifications } from "../../context/NotificationContext";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatRelativeDate, notificationMeta } from "../../utils/formatters";
import type { Notification } from "../../types";

export const NotificationsScreen: React.FC = () => {
  const { notifications, unreadCount, isLoading, refresh, markRead, markAllRead } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => markAllRead().catch(() => {})}
            activeOpacity={0.75}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && notifications.length === 0 ? (
        <LoadingSpinner message="Loading notifications..." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Notification }) => {
            const meta = notificationMeta(item.type);
            return (
              <TouchableOpacity
                onPress={() => {
                  if (!item.isRead) markRead(item.id).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <View style={[!item.isRead && styles.unreadIndicator]}>
                  <Card style={styles.card}>
                    <View style={styles.row}>
                      <Feather
                        name={meta.icon as keyof typeof Feather.glyphMap}
                        size={18}
                        color={item.isRead ? colors.textMuted : colors.primary}
                      />
                      <View style={styles.content}>
                        <Text style={[styles.titleText, !item.isRead && { fontWeight: "700" }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.body}>{item.body}</Text>
                        <Text style={styles.time}>{formatRelativeDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  </Card>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
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
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
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
  },
  card: {
    marginBottom: spacing.md,
  },
  unreadIndicator: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: typography.sizes.base,
  },
});
