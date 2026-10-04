import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  const backgroundColors: Record<ButtonVariant, string> = {
    primary: colors.primaryDark,
    secondary: colors.primarySoft,
    outline: "transparent",
    danger: colors.danger,
    ghost: "transparent",
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: colors.textInverse,
    secondary: colors.primaryDark,
    outline: colors.primaryDark,
    danger: colors.textInverse,
    ghost: colors.textSecondary,
  };

  const borderColors: Record<ButtonVariant, string> = {
    primary: "transparent",
    secondary: colors.primarySoft,
    outline: colors.borderStrong,
    danger: "transparent",
    ghost: "transparent",
  };

  const sizeStyles: Record<ButtonSize, { height: number; px: number; fontSize: number; iconSize: number }> = {
    sm: { height: 38, px: spacing.md, fontSize: typography.sizes.xs, iconSize: 14 },
    md: { height: 48, px: spacing.lg, fontSize: typography.sizes.sm, iconSize: 16 },
    lg: { height: 54, px: spacing.xl, fontSize: typography.sizes.base, iconSize: 18 },
  };

  const currentSize = sizeStyles[size];
  const textColor = textColors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: backgroundColors[variant],
          borderColor: borderColors[variant],
          borderWidth: variant === "outline" ? 1.5 : 0,
          minHeight: currentSize.height,
          paddingHorizontal: currentSize.px,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={textColor} size="small" />
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: currentSize.fontSize,
                marginLeft: spacing.xs + 2,
              },
              textStyle,
            ]}
          >
            Please wait...
          </Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === "left" ? (
            <Feather
              name={icon}
              size={currentSize.iconSize}
              color={textColor}
              style={styles.leftIcon}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: currentSize.fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === "right" ? (
            <Feather
              name={icon}
              size={currentSize.iconSize}
              color={textColor}
              style={styles.rightIcon}
            />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  leftIcon: {
    marginRight: spacing.xs + 2,
  },
  rightIcon: {
    marginLeft: spacing.xs + 2,
  },
});
