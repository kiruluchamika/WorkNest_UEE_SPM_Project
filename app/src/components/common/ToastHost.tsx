import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { subscribeToToasts, ToastMessage, ToastType } from "../../utils/toast";

const VISIBLE_MS: Record<ToastType, number> = {
  success: 3000,
  info: 3500,
  error: 5000,
};

const VARIANTS: Record<
  ToastType,
  { icon: React.ComponentProps<typeof Feather>["name"]; color: string; background: string; border: string }
> = {
  success: { icon: "check-circle", color: colors.success, background: colors.successLight, border: colors.successBorder },
  error: { icon: "alert-circle", color: colors.danger, background: colors.dangerLight, border: colors.dangerBorder },
  info: { icon: "info", color: colors.info, background: colors.infoLight, border: colors.infoBorder },
};

export const ToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setCurrent(null);
    });
  }, [anim]);

  useEffect(() => {
    return subscribeToToasts((next) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent(next);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      timer.current = setTimeout(dismiss, VISIBLE_MS[next.type]);
    });
  }, [anim, dismiss]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!current) return null;

  const variant = VARIANTS[current.type];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        }}
      >
        <Pressable
          onPress={dismiss}
          accessibilityRole="alert"
          accessibilityLiveRegion={current.type === "error" ? "assertive" : "polite"}
          testID={`toast-${current.type}`}
          style={[styles.toast, { backgroundColor: variant.background, borderColor: variant.border }]}
        >
          <Feather name={variant.icon} size={20} color={variant.color} style={styles.icon} />
          <View style={styles.body}>
            <Text style={styles.title}>{current.title}</Text>
            {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          </View>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 480,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.medium,
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  body: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    lineHeight: 19,
  },
});
