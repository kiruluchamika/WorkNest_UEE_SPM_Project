import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { JobApplicationStatus, GigPostStatus, GigStatus } from "../../types";

export type StatusVariant = "warning" | "primary" | "success" | "danger" | "muted" | "info" | "purple";

interface StatusConfig {
  label: string;
  variant: StatusVariant;
  icon?: keyof typeof Feather.glyphMap;
  bg: string;
  border: string;
  text: string;
}

const APP_STATUS_CONFIG: Record<JobApplicationStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    variant: "warning",
    icon: "clock",
    bg: colors.warningLight,
    border: colors.warningBorder,
    text: colors.warningText,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    variant: "info",
    icon: "star",
    bg: colors.infoLight,
    border: colors.infoBorder,
    text: colors.infoText,
  },
  HIRED: {
    label: "Hired",
    variant: "success",
    icon: "check-circle",
    bg: colors.successLight,
    border: colors.successBorder,
    text: colors.successText,
  },
  COMPLETED: {
    label: "Completed",
    variant: "purple",
    icon: "award",
    bg: colors.purpleLight,
    border: colors.purpleBorder,
    text: colors.purpleText,
  },
  REJECTED: {
    label: "Rejected",
    variant: "danger",
    icon: "x-circle",
    bg: colors.dangerLight,
    border: colors.dangerBorder,
    text: colors.dangerText,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "muted",
    icon: "slash",
    bg: colors.neutralLight,
    border: colors.neutralBorder,
    text: colors.neutralText,
  },
};

const GIG_POST_STATUS_CONFIG: Record<GigPostStatus, StatusConfig> = {
  ACTIVE: {
    label: "Active",
    variant: "success",
    icon: "check-circle",
    bg: colors.successLight,
    border: colors.successBorder,
    text: colors.successText,
  },
  PENDING: {
    label: "In Review",
    variant: "warning",
    icon: "clock",
    bg: colors.warningLight,
    border: colors.warningBorder,
    text: colors.warningText,
  },
  COMPLETED: {
    label: "Completed",
    variant: "purple",
    icon: "award",
    bg: colors.purpleLight,
    border: colors.purpleBorder,
    text: colors.purpleText,
  },
  CLOSED: {
    label: "Closed",
    variant: "muted",
    icon: "lock",
    bg: colors.neutralLight,
    border: colors.neutralBorder,
    text: colors.neutralText,
  },
  REJECTED: {
    label: "Rejected",
    variant: "danger",
    icon: "x-circle",
    bg: colors.dangerLight,
    border: colors.dangerBorder,
    text: colors.dangerText,
  },
};

const GIG_STATUS_CONFIG: Record<GigStatus, StatusConfig> = {
  open: {
    label: "Open",
    variant: "success",
    icon: "check-circle",
    bg: colors.successLight,
    border: colors.successBorder,
    text: colors.successText,
  },
  filled: {
    label: "Filled",
    variant: "warning",
    icon: "users",
    bg: colors.warningLight,
    border: colors.warningBorder,
    text: colors.warningText,
  },
  completed: {
    label: "Completed",
    variant: "purple",
    icon: "award",
    bg: colors.purpleLight,
    border: colors.purpleBorder,
    text: colors.purpleText,
  },
  cancelled: {
    label: "Cancelled",
    variant: "muted",
    icon: "slash",
    bg: colors.neutralLight,
    border: colors.neutralBorder,
    text: colors.neutralText,
  },
};

const VARIANT_CONFIG: Record<StatusVariant, { bg: string; border: string; text: string; icon?: keyof typeof Feather.glyphMap }> = {
  warning: {
    bg: colors.warningLight,
    border: colors.warningBorder,
    text: colors.warningText,
    icon: "clock",
  },
  primary: {
    bg: colors.primarySoft,
    border: colors.borderStrong,
    text: colors.primaryDark,
    icon: "info",
  },
  info: {
    bg: colors.infoLight,
    border: colors.infoBorder,
    text: colors.infoText,
    icon: "star",
  },
  success: {
    bg: colors.successLight,
    border: colors.successBorder,
    text: colors.successText,
    icon: "check-circle",
  },
  danger: {
    bg: colors.dangerLight,
    border: colors.dangerBorder,
    text: colors.dangerText,
    icon: "x-circle",
  },
  muted: {
    bg: colors.neutralLight,
    border: colors.neutralBorder,
    text: colors.neutralText,
    icon: "slash",
  },
  purple: {
    bg: colors.purpleLight,
    border: colors.purpleBorder,
    text: colors.purpleText,
    icon: "award",
  },
};

interface StatusBadgeProps {
  status?: JobApplicationStatus | GigPostStatus | GigStatus | string;
  label?: string;
  variant?: StatusVariant;
  size?: "sm" | "md";
  showIcon?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  variant,
  size = "md",
  showIcon = true,
  style,
  textStyle,
}) => {
  let config: StatusConfig | undefined;

  if (status && status in APP_STATUS_CONFIG) {
    config = APP_STATUS_CONFIG[status as JobApplicationStatus];
  } else if (status && status in GIG_POST_STATUS_CONFIG) {
    config = GIG_POST_STATUS_CONFIG[status as GigPostStatus];
  } else if (status && status in GIG_STATUS_CONFIG) {
    config = GIG_STATUS_CONFIG[status as GigStatus];
  }


  const effectiveVariant = variant || config?.variant || "muted";
  const effectiveLabel = label || config?.label || status || "";
  const variantStyles = VARIANT_CONFIG[effectiveVariant] || VARIANT_CONFIG.muted;
  const iconName = config?.icon || variantStyles.icon;

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config?.bg || variantStyles.bg,
          borderColor: config?.border || variantStyles.border,
          paddingHorizontal: isSmall ? spacing.xs + 2 : spacing.sm + 2,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${effectiveLabel}`}
    >
      {showIcon && iconName ? (
        <Feather
          name={iconName}
          size={isSmall ? 10 : 12}
          color={config?.text || variantStyles.text}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          {
            color: config?.text || variantStyles.text,
            fontSize: isSmall ? typography.sizes.xxs : typography.sizes.xs,
          },
          textStyle,
        ]}
      >
        {effectiveLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
