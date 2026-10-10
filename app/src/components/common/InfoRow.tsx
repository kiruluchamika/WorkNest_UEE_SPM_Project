import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface InfoRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | number | null;
  onPress?: () => void;
  isLink?: boolean;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  value,
  onPress,
  isLink = false,
  rightElement,
  style,
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={15} color={colors.primaryDark} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {value !== undefined && value !== null ? (
          <Text
            style={[
              styles.value,
              isLink ? styles.linkValue : null,
            ]}
            numberOfLines={onPress ? 1 : undefined}
          >
            {value}
          </Text>
        ) : null}
      </View>
      {rightElement ? (
        <View style={styles.right}>{rightElement}</View>
      ) : isLink || onPress ? (
        <Feather name="external-link" size={14} color={colors.primaryDark} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole={isLink ? "link" : "button"}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600",
    lineHeight: 18,
  },
  linkValue: {
    color: colors.primaryDark,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  right: {
    marginLeft: spacing.sm,
  },
});
