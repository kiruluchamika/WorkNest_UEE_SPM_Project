import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Variant = "success" | "warning" | "danger" | "muted" | "primary";

interface TrustBadgeProps {
  label: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { background: string; text: string }> = {
  success: { background: colors.successLight, text: colors.success },
  warning: { background: "#FFF8E1", text: colors.warning },
  danger: { background: colors.dangerLight, text: colors.danger },
  muted: { background: colors.cream, text: colors.textMuted },
  primary: { background: colors.primarySoft, text: colors.primaryDark },
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({ label, variant = "primary" }) => {
  const style = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
