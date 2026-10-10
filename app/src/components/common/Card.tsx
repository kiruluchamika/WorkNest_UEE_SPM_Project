import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

export type CardVariant = "default" | "elevated" | "flat" | "highlight" | "warning" | "danger";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  paddingSize?: "sm" | "md" | "lg";
  variant?: CardVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  noPadding = false,
  paddingSize = "md",
  variant = "default",
  onPress,
  accessibilityLabel,
}) => {
  const paddingValues = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const currentPadding = noPadding ? 0 : paddingValues[paddingSize];

  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      ...shadows.subtle,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderColor: colors.borderLight,
      borderWidth: 1,
      ...shadows.medium,
    },
    flat: {
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.border,
      borderWidth: 1,
    },
    highlight: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.borderStrong,
      borderWidth: 1,
    },
    warning: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warningBorder,
      borderWidth: 1,
    },
    danger: {
      backgroundColor: colors.dangerLight,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
    },
  };

  const cardStyle = [
    styles.card,
    variantStyles[variant],
    { padding: currentPadding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
});
