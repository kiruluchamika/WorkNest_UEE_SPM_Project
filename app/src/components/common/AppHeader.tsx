import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onBellPress?: () => void;
  onProfilePress?: () => void;
  rightElement?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  onBellPress,
  onProfilePress,
  rightElement,
}) => {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleProfile = () => {
    setMenuVisible(false);
    onProfilePress?.();
  };

  const handleSignOut = async () => {
    setMenuVisible(false);
    await logout();
  };

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        {showBack && onBackPress ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <Image
            source={require("../../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <View style={styles.copy}>
          <Text style={styles.brand} numberOfLines={1}>
            {title || "WorkNest"}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {rightElement ? (
          rightElement
        ) : (
          <>
            <NotificationBell onPress={onBellPress} />
            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="User profile menu"
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>
                  {user?.name?.charAt(0).toUpperCase() || "W"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.menuAvatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {user?.name?.charAt(0).toUpperCase() || "W"}
                  </Text>
                )}
              </View>
              <View style={styles.menuIdentity}>
                <Text style={styles.menuName} numberOfLines={1}>
                  {user?.name || "WorkNest User"}
                </Text>
                {user?.email ? (
                  <Text style={styles.menuEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.menuDivider} />

            {onProfilePress ? (
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleProfile}
              >
                <Feather name="user" size={16} color={colors.textSecondary} />
                <Text style={styles.menuItemTextDefault}>My Profile</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={16} color={colors.danger} />
              <Text style={styles.menuItemTextDanger}>Sign Out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingVertical: spacing.sm + 2,
    minHeight: 56,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: spacing.sm,
  },
  copy: {
    flex: 1,
  },
  brand: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginLeft: spacing.xs,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(21, 36, 41, 0.4)",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: spacing.md,
  },
  menuCard: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.floating,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    overflow: "hidden",
  },
  menuAvatarImage: {
    width: "100%",
    height: "100%",
  },
  menuIdentity: {
    flex: 1,
  },
  menuName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  menuEmail: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  menuItemTextDefault: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  menuItemTextDanger: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.danger,
    marginLeft: spacing.sm,
  },
});
