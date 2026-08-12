import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface AppHeaderProps {
  subtitle?: string;
  onBellPress?: () => void;
  onProfilePress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  subtitle,
  onBellPress,
  onProfilePress,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Feather name="briefcase" size={14} color={colors.textInverse} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.brand}>WorkNest</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8} onPress={onBellPress}>
          <Feather name="bell" size={14} color={colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={onProfilePress}>
          <Feather name="user" size={13} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  copy: {
    flex: 1,
  },
  brand: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
});
