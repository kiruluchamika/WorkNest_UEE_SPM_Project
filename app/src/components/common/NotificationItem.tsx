import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "./Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatRelativeDate, notificationMeta } from "../../utils/formatters";
import type { Notification } from "../../types";

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const meta = notificationMeta(notification.type);
  const isUnread = !notification.isRead;
  const cardStyle = StyleSheet.flatten<ViewStyle>([styles.card, isUnread && styles.unreadCard]);

  return (
    <TouchableOpacity onPress={() => onPress(notification)} activeOpacity={0.8}>
      <Card style={cardStyle}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, isUnread && styles.iconWrapUnread]}>
            <Feather
              name={meta.icon as keyof typeof Feather.glyphMap}
              size={18}
              color={isUnread ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
                {notification.title}
              </Text>
              {isUnread ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.time}>{formatRelativeDate(notification.createdAt)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  unreadCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  row: {
    flexDirection: "row",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: {
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: typography.sizes.base,
    color: colors.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: "700",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
