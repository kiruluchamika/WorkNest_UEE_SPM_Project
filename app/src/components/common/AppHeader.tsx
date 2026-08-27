import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

interface AppHeaderProps {
  subtitle?: string;
  onBellPress?: () => void;
  onProfilePress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ subtitle, onBellPress, onProfilePress }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
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
        <Image
          source={require("../../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.copy}>
          <Text style={styles.brand}>WorkNest</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8} onPress={onBellPress}>
          <Feather name="bell" size={14} color={colors.primaryDark} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => setMenuVisible(true)}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Feather name="user" size={13} color={colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.menuAvatarImage} />
                ) : (
                  <Feather name="user" size={16} color={colors.textInverse} />
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
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={handleProfile}>
                <Feather name="user" size={14} color={colors.text} />
                <Text style={styles.menuItemTextDefault}>My Profile</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={handleSignOut}>
              <Feather name="log-out" size={14} color={colors.danger} />
              <Text style={styles.menuItemText}>Sign Out</Text>
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
    paddingVertical: spacing.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 2,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: "800",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 46, 0.35)",
    alignItems: "flex-end",
    paddingTop: 64,
    paddingRight: spacing.md,
  },
  menuCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.medium,
    shadowColor: colors.shadow,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuAvatar: {
    width: 36,
    height: 36,
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
  },
  menuItemTextDefault: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  menuItemText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.danger,
    marginLeft: spacing.sm,
  },
});
