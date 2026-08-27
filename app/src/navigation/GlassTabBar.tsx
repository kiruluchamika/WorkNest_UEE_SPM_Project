import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

// A floating, frosted "liquid glass" pill tab bar shared by every role's
// bottom tab navigator (ShopOwner/JobSeeker/Admin), replacing the default
// flat white tabBar. Reads tabBarIcon/tabBarLabel straight off each route's
// existing `options` (set via each navigator's own screenOptions) so the
// per-role icon logic stays where it already lives — this component only
// owns the shared chrome.
export const GlassTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + spacing.sm }]}>
      <BlurView intensity={80} tint="light" style={styles.bar}>
        <View style={styles.tint} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
          const iconColor = isFocused ? colors.textInverse : colors.primaryDark;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabButton}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                {typeof options.tabBarIcon === "function"
                  ? options.tabBarIcon({ focused: isFocused, color: iconColor, size: 22 })
                  : null}
              </View>
              <Text
                style={[styles.label, { color: isFocused ? colors.primaryDark : colors.textMuted }]}
                numberOfLines={1}
              >
                {String(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 36,
    overflow: "hidden",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
      default: {
        // Web (Expo/react-native-web) reads boxShadow, not the RN shadow* props.
        boxShadow: "0 10px 28px rgba(4, 95, 112, 0.18)",
      },
    }),
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(220, 242, 244, 0.55)",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconWrap: {
    width: 48,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
