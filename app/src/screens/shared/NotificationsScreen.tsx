import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatRelativeDate } from "../../utils/formatters";
import type { Notification } from "../../types";

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    userId: "user-1",
    title: "Application viewed",
    body: "Savi's Café reviewed your application for Weekend Café Assistant.",
    read: false,
    createdAt: "2026-08-07T10:00:00Z",
  },
  {
    id: "n2",
    userId: "user-1",
    title: "New gig match",
    body: "A new delivery gig was posted near Colombo 03.",
    read: false,
    createdAt: "2026-08-07T08:00:00Z",
  },
  {
    id: "n3",
    userId: "user-2",
    title: "New applicant",
    body: "Amal Perera applied for Weekend Café Assistant.",
    read: true,
    createdAt: "2026-08-06T14:00:00Z",
  },
];

export const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(
    DEMO_NOTIFICATIONS.filter((n) => n.userId === user?.id || n.userId === "user-1" || n.userId === "user-2")
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some((n) => !n.read) ? (
          <TouchableOpacity
            onPress={markAllRead}
            activeOpacity={0.75}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markRead(item.id)}>
            <View style={[!item.read && styles.unreadIndicator]}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Feather
                    name="bell"
                    size={18}
                    color={item.read ? colors.textMuted : colors.primary}
                  />
                  <View style={styles.content}>
                    <Text style={[styles.titleText, !item.read && { fontWeight: "700" }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.time}>{formatRelativeDate(item.createdAt)}</Text>
                  </View>
                </View>
              </Card>
            </View>
          </TouchableOpacity>
        )}

        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
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
