import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  actionVariant?: "primary" | "secondary" | "outline";
  style?: ViewStyle;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "inbox",
  title,
  description,
  actionTitle,
  onAction,
  actionVariant = "primary",
  style,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact ? styles.compact : null, style]}>
      <View style={[styles.iconWrap, compact ? styles.iconWrapCompact : null]}>
        <Feather
          name={icon}
          size={compact ? 22 : 28}
          color={colors.primaryDark}
        />
      </View>
      <Text style={[styles.title, compact ? styles.titleCompact : null]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, compact ? styles.descriptionCompact : null]}>
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          variant={actionVariant}
          onPress={onAction}
          size={compact ? "sm" : "md"}
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  compact: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconWrapCompact: {
    width: 44,
    height: 44,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  titleCompact: {
    fontSize: typography.sizes.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  descriptionCompact: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  actionButton: {
    marginTop: spacing.md,
    minWidth: 140,
  },
});
