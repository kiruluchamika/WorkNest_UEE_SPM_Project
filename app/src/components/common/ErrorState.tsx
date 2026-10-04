import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "We couldn't load this information. Please check your connection and try again.",
  onRetry,
  onGoBack,
  retryLabel = "Try Again",
  style,
  fullScreen = false,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <View style={styles.iconWrap}>
        <Feather name="alert-circle" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {onRetry ? (
          <Button
            title={retryLabel}
            onPress={onRetry}
            size="md"
            style={styles.button}
          />
        ) : null}
        {onGoBack ? (
          <Button
            title="Go Back"
            variant="outline"
            onPress={onGoBack}
            size="md"
            style={onRetry ? styles.buttonWithMargin : styles.button}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 0,
    borderRadius: 0,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: spacing.lg,
  },
  actions: {
    width: "100%",
    maxWidth: 240,
    alignItems: "center",
  },
  button: {
    width: "100%",
  },
  buttonWithMargin: {
    width: "100%",
    marginTop: spacing.sm,
  },
});

