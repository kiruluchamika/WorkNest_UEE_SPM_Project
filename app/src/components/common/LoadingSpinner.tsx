import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  fullScreen = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        fullScreen ? { flex: 1, backgroundColor: colors.background } : null,
      ]}
    >
      <Image
        source={require("../../../assets/images/loading.gif")}
        style={fullScreen ? styles.gifLarge : styles.gifSmall}
        resizeMode="contain"
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  gifLarge: {
    width: 120,
    height: 120,
  },
  gifSmall: {
    width: 56,
    height: 56,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});
